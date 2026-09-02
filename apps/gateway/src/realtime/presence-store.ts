import {
  PRESENCE_EXPIRY_MS,
  type BasicPresence,
  type PresenceSnapshot,
  type PresenceWithLocation,
  type PublishedPresence,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import {
  type BackgroundTaskRunner,
  unmanagedBackgroundTaskRunner,
} from "#src/platform/background-tasks";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { canReadPreciseLocation } from "#src/realtime/subscription-policy";
import type { CoveragePublisher } from "#src/rabbit/coverage-publisher";

type Basic = typeof BasicPresence.Type;
type Precise = typeof PresenceWithLocation.Type;
type Published = typeof PublishedPresence.Type;
type Snapshot = typeof PresenceSnapshot.Type;
type Event = typeof ServerEvent.Type;

const REDIS_TTL_SECONDS = Math.ceil(PRESENCE_EXPIRY_MS / 1_000);
const SWEEP_INTERVAL_MS = 5_000;

const withoutLocation = (presence: Basic | Precise): Basic => {
  const { location: _location, ...basic } = presence as Precise;
  return basic;
};

export class PresenceStore {
  private sweepTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly redis: RedisGatewayStore,
    private readonly hub: RealtimeHub,
    private readonly now: () => number = Date.now,
    private readonly coverage?: CoveragePublisher,
    private readonly runBackground: BackgroundTaskRunner = unmanagedBackgroundTaskRunner,
  ) {}

  start(): void {
    this.sweepTimer = setInterval(() => {
      this.runBackground("presence.sweep", () => this.sweepExpired());
    }, SWEEP_INTERVAL_MS);
  }

  stop(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  async publish(
    socket: GatewaySocket,
    data: Published,
  ): Promise<Basic | Precise> {
    const allowedOrganizationIds = new Set(
      socket.data.guilds.map(({ guild }) => guild.id),
    );
    const selectedOrganizationIds = [
      ...new Set(
        data.organizationIds.filter((id) => allowedOrganizationIds.has(id)),
      ),
    ];
    await this.removeFromUnselectedOrganizations(
      socket,
      selectedOrganizationIds,
    );
    if (selectedOrganizationIds.length === 0) {
      throw new Error("presence publication has no authorized organization");
    }

    const previousPresence = socket.data.presence;
    const presence: Basic | Precise = {
      userId: socket.data.userId,
      sessionId: socket.data.connectionId,
      organizationIds: selectedOrganizationIds,
      platform: socket.data.platform,
      status: "online",
      confidence: socket.data.confidence,
      isAfk: data.isAfk ?? false,
      lastSeen: this.now(),
      character: socket.data.character ?? data.character,
      ...(data.location ? { location: data.location } : {}),
    };
    socket.data.presence = presence;

    for (const organizationId of selectedOrganizationIds) {
      await this.write(organizationId, presence, socket.data.discordId);
      await this.broadcastUpsert(organizationId, presence);
      await this.publishCoverageChange(
        socket.data.discordId,
        organizationId,
        previousPresence,
        presence,
      );
    }
    return presence;
  }

  async heartbeat(socket: GatewaySocket, sessionId: string): Promise<number> {
    if (sessionId !== socket.data.connectionId || !socket.data.presence) {
      throw new Error("heartbeat session does not match the connection");
    }
    const presence = { ...socket.data.presence, lastSeen: this.now() };
    socket.data.presence = presence;
    for (const organizationId of presence.organizationIds) {
      await this.write(organizationId, presence, socket.data.discordId);
      await this.broadcastUpsert(organizationId, presence);
    }
    await this.hub.refreshRegistry(socket.data);
    return presence.lastSeen;
  }

  async disconnect(session: SessionData): Promise<void> {
    const presence = session.presence;
    if (!presence) return;
    for (const organizationId of presence.organizationIds) {
      if ("location" in presence && presence.location?.map) {
        await this.coverage?.publish({
          guildId: organizationId,
          mapName: presence.location.map,
          discordId: session.discordId,
          hasPlayer: false,
          isAfk: presence.isAfk,
        });
      }
      await this.remove(organizationId, presence.userId, presence.sessionId);
    }
  }

  async snapshot(
    viewer: SessionData,
    organizationId: string,
    world?: string,
  ): Promise<Snapshot> {
    const presences = await this.readOrganization(organizationId);
    const includeLocation = canReadPreciseLocation(viewer, organizationId);
    const filtered = presences
      .filter(
        (presence) =>
          world === undefined || presence.character?.world === world,
      )
      .map((presence) =>
        includeLocation ? presence : withoutLocation(presence),
      );
    return {
      organizationId,
      world,
      revision: await this.getRevision(organizationId),
      presences: filtered,
    };
  }

  async sweepExpired(): Promise<void> {
    const organizations = await this.redis.command.smembers(
      "presence:organizations",
    );
    for (const organizationId of organizations) {
      const lock = await this.redis.command.set(
        `presence:sweep-lock:${organizationId}`,
        this.hub.instanceId,
        "EX",
        10,
        "NX",
      );
      if (lock !== "OK") continue;
      const keys = await this.redis.command.smembers(
        this.indexKey(organizationId),
      );
      if (keys.length === 0) continue;
      const values = await this.redis.command.mget(keys);
      for (const [index, value] of values.entries()) {
        const key = keys[index];
        if (!key) continue;
        let expired = value === null;
        if (value) {
          try {
            const presence = JSON.parse(value) as Basic | Precise;
            expired = this.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS;
          } catch {
            expired = true;
          }
        }
        if (!expired) continue;
        const sessionId = key.slice(key.lastIndexOf(":") + 1);
        const metadata = await this.readMetadata(organizationId, sessionId);
        const userId = metadata?.userId;
        if (userId) await this.remove(organizationId, userId, sessionId);
        else await this.redis.command.srem(this.indexKey(organizationId), key);
      }
    }
  }

  async coverageForMap(
    organizationId: string,
    mapName: string,
  ): Promise<Array<{ readonly discordId: string; readonly isAfk: boolean }>> {
    const presences = await this.readOrganization(organizationId);
    const result: Array<{
      readonly discordId: string;
      readonly isAfk: boolean;
    }> = [];
    for (const presence of presences) {
      if (!("location" in presence) || presence.location?.map !== mapName)
        continue;
      const metadata = await this.readMetadata(
        organizationId,
        presence.sessionId,
      );
      if (metadata)
        result.push({ discordId: metadata.discordId, isAfk: presence.isAfk });
    }
    return result;
  }

  private async removeFromUnselectedOrganizations(
    socket: GatewaySocket,
    selected: ReadonlyArray<string>,
  ): Promise<void> {
    const previous = socket.data.presence?.organizationIds ?? [];
    const selectedSet = new Set(selected);
    for (const organizationId of previous) {
      if (!selectedSet.has(organizationId)) {
        await this.remove(
          organizationId,
          socket.data.userId,
          socket.data.connectionId,
        );
      }
    }
  }

  private async write(
    organizationId: string,
    presence: Basic | Precise,
    discordId: string,
  ): Promise<void> {
    const key = this.presenceKey(organizationId, presence.sessionId);
    await Promise.all([
      this.redis.command.set(
        key,
        JSON.stringify(presence),
        "EX",
        REDIS_TTL_SECONDS,
      ),
      this.redis.command.sadd(this.indexKey(organizationId), key),
      this.redis.command.sadd("presence:organizations", organizationId),
      this.redis.command.set(
        this.metadataKey(organizationId, presence.sessionId),
        JSON.stringify({
          userId: presence.userId,
          discordId,
        }),
        "EX",
        REDIS_TTL_SECONDS * 2,
      ),
    ]);
  }

  private async remove(
    organizationId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const key = this.presenceKey(organizationId, sessionId);
    await Promise.all([
      this.redis.command.del(key),
      this.redis.command.del(this.metadataKey(organizationId, sessionId)),
      this.redis.command.srem(this.indexKey(organizationId), key),
    ]);
    const revision = await this.nextRevision(organizationId);
    const event = {
      v: 1,
      type: "presence.delta",
      sequence: revision,
      data: {
        organizationId,
        revision,
        changes: [{ action: "remove", userId, sessionId }],
      },
    } satisfies Event;
    await this.hub.publishToScope(
      { topic: "organization.presence", organizationId },
      event,
    );
  }

  private async broadcastUpsert(
    organizationId: string,
    presence: Basic | Precise,
  ): Promise<void> {
    const revision = await this.nextRevision(organizationId);
    const makeEvent = (value: Basic | Precise) =>
      ({
        v: 1,
        type: "presence.delta",
        sequence: revision,
        data: {
          organizationId,
          revision,
          changes: [{ action: "upsert", presence: value }],
        },
      }) satisfies Event;
    await this.hub.publishPresence(
      { topic: "organization.presence", organizationId },
      makeEvent(withoutLocation(presence)),
      makeEvent(presence),
    );
  }

  private async readOrganization(
    organizationId: string,
  ): Promise<Array<Basic | Precise>> {
    const keys = await this.redis.command.smembers(
      this.indexKey(organizationId),
    );
    if (keys.length === 0) return [];
    const values = await this.redis.command.mget(keys);
    const presences: Array<Basic | Precise> = [];
    for (const value of values) {
      if (!value) {
        continue;
      }
      try {
        const presence = JSON.parse(value) as Basic | Precise;
        if (this.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS) {
          continue;
        } else {
          presences.push(presence);
        }
      } catch {
        continue;
      }
    }
    return presences;
  }

  private nextRevision(organizationId: string): Promise<number> {
    return this.redis.command.incr(`presence:revision:${organizationId}`);
  }

  private async getRevision(organizationId: string): Promise<number> {
    const value = await this.redis.command.get(
      `presence:revision:${organizationId}`,
    );
    return Number(value ?? 0);
  }

  private presenceKey(organizationId: string, sessionId: string): string {
    return `presence:${organizationId}:${sessionId}`;
  }

  private indexKey(organizationId: string): string {
    return `presence:index:${organizationId}`;
  }

  private metadataKey(organizationId: string, sessionId: string): string {
    return `presence:metadata:${organizationId}:${sessionId}`;
  }

  private async readMetadata(
    organizationId: string,
    sessionId: string,
  ): Promise<{ readonly userId: string; readonly discordId: string } | null> {
    const value = await this.redis.command.get(
      this.metadataKey(organizationId, sessionId),
    );
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return typeof parsed.userId === "string" &&
        typeof parsed.discordId === "string"
        ? { userId: parsed.userId, discordId: parsed.discordId }
        : null;
    } catch {
      return null;
    }
  }

  private async publishCoverageChange(
    discordId: string,
    organizationId: string,
    previous: Basic | Precise | undefined,
    current: Basic | Precise,
  ): Promise<void> {
    const oldMap =
      previous && "location" in previous ? previous.location.map : undefined;
    const newMap = "location" in current ? current.location?.map : undefined;
    if (oldMap && oldMap !== newMap) {
      await this.coverage?.publish({
        guildId: organizationId,
        mapName: oldMap,
        discordId,
        hasPlayer: false,
        isAfk: current.isAfk,
      });
    }
    if (newMap && (oldMap !== newMap || previous?.isAfk !== current.isAfk)) {
      await this.coverage?.publish({
        guildId: organizationId,
        mapName: newMap,
        discordId,
        hasPlayer: true,
        isAfk: current.isAfk,
      });
    }
  }
}
