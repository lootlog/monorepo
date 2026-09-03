import {
  BasicPresence,
  PRESENCE_EXPIRY_MS,
  type PresenceSnapshot,
  PresenceWithLocation,
  type PublishedPresence,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { RedisGatewayStore } from "#src/platform/redis-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { canReadPreciseLocation } from "#src/realtime/subscription-policy";
import type { CoveragePublisher } from "#src/rabbit/coverage-publisher";
import { Effect, Schema } from "effect";
import {
  PresenceNotPublished,
  PresenceSessionMismatch,
  RealtimeStoreError,
} from "#src/realtime/realtime-errors";

type PresenceFailure =
  | PresenceNotPublished
  | PresenceSessionMismatch
  | RealtimeStoreError;

const asPresenceFailure = (
  operation: string,
  cause: unknown,
): PresenceFailure =>
  cause instanceof PresenceNotPublished ||
  cause instanceof PresenceSessionMismatch ||
  cause instanceof RealtimeStoreError
    ? cause
    : new RealtimeStoreError({ operation, cause });

type Basic = typeof BasicPresence.Type;
type Precise = typeof PresenceWithLocation.Type;
type Published = typeof PublishedPresence.Type;
type Snapshot = typeof PresenceSnapshot.Type;
type Event = typeof ServerEvent.Type;

const REDIS_TTL_SECONDS = Math.ceil(PRESENCE_EXPIRY_MS / 1_000);
const SWEEP_INTERVAL_MS = 5_000;
const PresenceJson = Schema.fromJsonString(
  Schema.Union([PresenceWithLocation, BasicPresence]),
);
const PresenceMetadataJson = Schema.fromJsonString(
  Schema.Struct({ userId: Schema.String, discordId: Schema.String }),
);
const decodePresence = Schema.decodeUnknownSync(PresenceJson);
const decodePresenceMetadata = Schema.decodeUnknownSync(PresenceMetadataJson);
const fromPromise = <A>(
  operation: string,
  evaluate: () => Promise<A>,
): Effect.Effect<A, RealtimeStoreError> =>
  Effect.tryPromise({
    try: evaluate,
    catch: (cause) => new RealtimeStoreError({ operation, cause }),
  });

const withoutLocation = (presence: Basic | Precise): Basic => {
  const { location: _location, ...basic } = presence as Precise;
  return basic;
};

export class PresenceStore {
  constructor(
    private readonly redis: RedisGatewayStore,
    private readonly hub: RealtimeHub,
    private readonly now: () => number = Date.now,
    private readonly coverage?: CoveragePublisher,
  ) {}

  readonly sweepSchedule = SWEEP_INTERVAL_MS;

  publish(
    socket: GatewaySocket,
    data: Published,
  ): Effect.Effect<Basic | Precise | undefined, PresenceFailure> {
    const self = this;
    return Effect.gen(function* () {
      const allowedOrganizationIds = new Set(
        socket.data.guilds.map(({ guild }) => guild.id),
      );
      const selectedOrganizationIds = [
        ...new Set(
          data.organizationIds.filter((id) => allowedOrganizationIds.has(id)),
        ),
      ];
      const previousPresence = socket.data.presence;
      if (selectedOrganizationIds.length === 0) {
        socket.data.presence = undefined;
      }
      yield* self.removeFromUnselectedOrganizations(
        socket,
        selectedOrganizationIds,
        previousPresence,
      );
      if (selectedOrganizationIds.length === 0) {
        return undefined;
      }

      const presence: Basic | Precise = {
        userId: socket.data.userId,
        sessionId: socket.data.connectionId,
        organizationIds: selectedOrganizationIds,
        platform: socket.data.platform,
        status: "online",
        confidence: socket.data.confidence,
        isAfk: data.isAfk ?? false,
        lastSeen: self.now(),
        character: socket.data.character ?? data.character,
        ...(data.location ? { location: data.location } : {}),
      };
      socket.data.presence = presence;

      for (const organizationId of selectedOrganizationIds) {
        yield* self.write(organizationId, presence, socket.data.discordId);
        yield* self.broadcastUpsert(organizationId, presence);
        yield* self.publishCoverageChange(
          socket.data.discordId,
          organizationId,
          previousPresence,
          presence,
        );
      }
      return presence;
    }).pipe(
      Effect.mapError((cause) => asPresenceFailure("presence.publish", cause)),
    );
  }

  heartbeat(
    socket: GatewaySocket,
    sessionId: string,
  ): Effect.Effect<number, PresenceFailure> {
    const self = this;
    return Effect.gen(function* () {
      if (sessionId !== socket.data.connectionId || !socket.data.presence) {
        return yield* Effect.fail(new PresenceSessionMismatch());
      }
      yield* self.reconcileAccess(socket);
      if (!socket.data.presence) {
        return yield* Effect.fail(new PresenceNotPublished());
      }
      const presence = { ...socket.data.presence, lastSeen: self.now() };
      socket.data.presence = presence;
      for (const organizationId of presence.organizationIds) {
        yield* self.write(organizationId, presence, socket.data.discordId);
        yield* self.broadcastUpsert(organizationId, presence);
      }
      yield* fromPromise("presence.refresh-registry", () =>
        self.hub.refreshRegistry(socket.data),
      );
      return presence.lastSeen;
    }).pipe(
      Effect.mapError((cause) =>
        asPresenceFailure("presence.heartbeat", cause),
      ),
    );
  }

  disconnect(session: SessionData): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const presence = session.presence;
      if (!presence) return;
      for (const organizationId of presence.organizationIds) {
        if ("location" in presence && presence.location?.map) {
          if (self.coverage)
            yield* self.coverage.publish({
              guildId: organizationId,
              mapName: presence.location.map,
              discordId: session.discordId,
              hasPlayer: false,
              isAfk: presence.isAfk,
            });
        }
        yield* self.remove(organizationId, presence.userId, presence.sessionId);
      }
    });
  }

  reconcileAccess(socket: GatewaySocket): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const previous = socket.data.presence;
      if (!previous) return;
      const allowedOrganizationIds = new Set(
        socket.data.guilds.map(({ guild }) => guild.id),
      );
      const retainedOrganizationIds = previous.organizationIds.filter((id) =>
        allowedOrganizationIds.has(id),
      );
      socket.data.presence =
        retainedOrganizationIds.length === 0
          ? undefined
          : { ...previous, organizationIds: retainedOrganizationIds };
      yield* self.removeFromUnselectedOrganizations(
        socket,
        retainedOrganizationIds,
        previous,
      );
    });
  }

  snapshot(
    viewer: SessionData,
    organizationId: string,
    world?: string,
  ): Effect.Effect<Snapshot, PresenceFailure> {
    const self = this;
    return Effect.gen(function* () {
      const presences = yield* self.readOrganization(organizationId);
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
        revision: yield* self.getRevision(organizationId),
        presences: filtered,
      };
    }).pipe(
      Effect.mapError((cause) => asPresenceFailure("presence.snapshot", cause)),
    );
  }

  sweepExpired(): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const organizations = yield* fromPromise(
        "presence.list-organizations",
        () => self.redis.command.smembers("presence:organizations"),
      );
      for (const organizationId of organizations) {
        const lock = yield* fromPromise("presence.acquire-sweep-lock", () =>
          self.redis.command.set(
            `presence:sweep-lock:${organizationId}`,
            self.hub.instanceId,
            "EX",
            10,
            "NX",
          ),
        );
        if (lock !== "OK") continue;
        const keys = yield* fromPromise("presence.list-organization", () =>
          self.redis.command.smembers(self.indexKey(organizationId)),
        );
        if (keys.length === 0) continue;
        const values = yield* fromPromise("presence.read-organization", () =>
          self.redis.command.mget(keys),
        );
        for (const [index, value] of values.entries()) {
          const key = keys[index];
          if (!key) continue;
          let expired = value === null;
          if (value) {
            try {
              const presence = decodePresence(value);
              expired = self.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS;
            } catch {
              expired = true;
            }
          }
          if (!expired) continue;
          const sessionId = key.slice(key.lastIndexOf(":") + 1);
          const metadata = yield* self.readMetadata(organizationId, sessionId);
          const userId = metadata?.userId;
          if (userId) yield* self.remove(organizationId, userId, sessionId);
          else
            yield* fromPromise("presence.remove-stale-index", () =>
              self.redis.command.srem(self.indexKey(organizationId), key),
            );
        }
      }
    });
  }

  coverageForMap(
    organizationId: string,
    mapName: string,
  ): Effect.Effect<
    Array<{ readonly discordId: string; readonly isAfk: boolean }>,
    unknown
  > {
    const self = this;
    return Effect.gen(function* () {
      const presences = yield* self.readOrganization(organizationId);
      const result: Array<{
        readonly discordId: string;
        readonly isAfk: boolean;
      }> = [];
      for (const presence of presences) {
        if (!("location" in presence) || presence.location?.map !== mapName)
          continue;
        const metadata = yield* self.readMetadata(
          organizationId,
          presence.sessionId,
        );
        if (metadata)
          result.push({ discordId: metadata.discordId, isAfk: presence.isAfk });
      }
      return result;
    });
  }

  private removeFromUnselectedOrganizations(
    socket: GatewaySocket,
    selected: ReadonlyArray<string>,
    previousPresence = socket.data.presence,
  ): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const previous = previousPresence?.organizationIds ?? [];
      const selectedSet = new Set(selected);
      for (const organizationId of previous) {
        if (!selectedSet.has(organizationId)) {
          const cleanup = [
            self.remove(
              organizationId,
              socket.data.userId,
              socket.data.connectionId,
            ),
          ];
          if (
            previousPresence &&
            "location" in previousPresence &&
            previousPresence.location?.map &&
            self.coverage
          ) {
            cleanup.push(
              self.coverage.publish({
                guildId: organizationId,
                mapName: previousPresence.location.map,
                discordId: socket.data.discordId,
                hasPlayer: false,
                isAfk: previousPresence.isAfk,
              }),
            );
          }
          yield* Effect.all(cleanup, {
            concurrency: "unbounded",
            discard: true,
          });
        }
      }
    });
  }

  private write(
    organizationId: string,
    presence: Basic | Precise,
    discordId: string,
  ): Effect.Effect<void, unknown> {
    const key = this.presenceKey(organizationId, presence.sessionId);
    return Effect.all(
      [
        fromPromise("presence.write", () =>
          this.redis.command.set(
            key,
            JSON.stringify(presence),
            "EX",
            REDIS_TTL_SECONDS,
          ),
        ),
        fromPromise("presence.index", () =>
          this.redis.command.sadd(this.indexKey(organizationId), key),
        ),
        fromPromise("presence.register-organization", () =>
          this.redis.command.sadd("presence:organizations", organizationId),
        ),
        fromPromise("presence.write-metadata", () =>
          this.redis.command.set(
            this.metadataKey(organizationId, presence.sessionId),
            JSON.stringify({
              userId: presence.userId,
              discordId,
            }),
            "EX",
            REDIS_TTL_SECONDS * 2,
          ),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    );
  }

  private remove(
    organizationId: string,
    userId: string,
    sessionId: string,
  ): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const key = self.presenceKey(organizationId, sessionId);
      yield* Effect.all(
        [
          fromPromise("presence.remove", () => self.redis.command.del(key)),
          fromPromise("presence.remove-metadata", () =>
            self.redis.command.del(self.metadataKey(organizationId, sessionId)),
          ),
          fromPromise("presence.remove-index", () =>
            self.redis.command.srem(self.indexKey(organizationId), key),
          ),
        ],
        { concurrency: "unbounded", discard: true },
      );
      const revision = yield* self.nextRevision(organizationId);
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
      yield* fromPromise("presence.publish-remove", () =>
        self.hub.publishToScope(
          { topic: "organization.presence", organizationId },
          event,
        ),
      );
    });
  }

  private broadcastUpsert(
    organizationId: string,
    presence: Basic | Precise,
  ): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const revision = yield* self.nextRevision(organizationId);
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
      yield* fromPromise("presence.publish-upsert", () =>
        self.hub.publishPresence(
          { topic: "organization.presence", organizationId },
          makeEvent(withoutLocation(presence)),
          makeEvent(presence),
        ),
      );
    });
  }

  private readOrganization(
    organizationId: string,
  ): Effect.Effect<Array<Basic | Precise>, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const keys = yield* fromPromise("presence.list-organization", () =>
        self.redis.command.smembers(self.indexKey(organizationId)),
      );
      if (keys.length === 0) return [];
      const values = yield* fromPromise("presence.read-organization", () =>
        self.redis.command.mget(keys),
      );
      const presences: Array<Basic | Precise> = [];
      for (const value of values) {
        if (!value) {
          continue;
        }
        try {
          const presence = decodePresence(value);
          if (self.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS) {
            continue;
          } else {
            presences.push(presence);
          }
        } catch {
          continue;
        }
      }
      return presences;
    });
  }

  private nextRevision(organizationId: string): Effect.Effect<number, unknown> {
    return fromPromise("presence.next-revision", () =>
      this.redis.command.incr(`presence:revision:${organizationId}`),
    );
  }

  private getRevision(organizationId: string): Effect.Effect<number, unknown> {
    return fromPromise("presence.get-revision", () =>
      this.redis.command.get(`presence:revision:${organizationId}`),
    ).pipe(Effect.map((value) => Number(value ?? 0)));
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

  private readMetadata(
    organizationId: string,
    sessionId: string,
  ): Effect.Effect<
    { readonly userId: string; readonly discordId: string } | null,
    unknown
  > {
    return fromPromise("presence.read-metadata", () =>
      this.redis.command.get(this.metadataKey(organizationId, sessionId)),
    ).pipe(
      Effect.map((value) => {
        if (!value) return null;
        try {
          return decodePresenceMetadata(value);
        } catch {
          return null;
        }
      }),
    );
  }

  private publishCoverageChange(
    discordId: string,
    organizationId: string,
    previous: Basic | Precise | undefined,
    current: Basic | Precise,
  ): Effect.Effect<void, unknown> {
    const oldMap =
      previous && "location" in previous ? previous.location.map : undefined;
    const newMap = "location" in current ? current.location?.map : undefined;
    const updates: Array<Effect.Effect<void, unknown>> = [];
    if (oldMap && oldMap !== newMap && this.coverage) {
      updates.push(
        this.coverage.publish({
          guildId: organizationId,
          mapName: oldMap,
          discordId,
          hasPlayer: false,
          isAfk: current.isAfk,
        }),
      );
    }
    if (
      newMap &&
      (oldMap !== newMap || previous?.isAfk !== current.isAfk) &&
      this.coverage
    ) {
      updates.push(
        this.coverage.publish({
          guildId: organizationId,
          mapName: newMap,
          discordId,
          hasPlayer: true,
          isAfk: current.isAfk,
        }),
      );
    }
    return Effect.all(updates, { concurrency: "unbounded", discard: true });
  }
}
