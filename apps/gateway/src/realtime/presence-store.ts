import { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  PRESENCE_EXPIRY_MS,
  type PresenceSnapshot,
  type PublishedPresence,
} from "@lootlog/protocol/realtime";
import { RabbitMessaging } from "@lootlog/messaging";
import { Context, Effect, Layer, Schedule } from "effect";
import { GatewayRedis } from "#src/platform/redis-store";
import {
  type CoveragePublisher,
  Coverage,
} from "#src/rabbit/coverage-publisher";
import {
  type OnlineHistory,
  OnlineHistories,
} from "#src/realtime/online-history";
import { PresenceDeltas } from "#src/realtime/presence-deltas";
import {
  EXPIRY_DUE_INDEX,
  PresenceExpiry,
} from "#src/realtime/presence-expiry";
import { PresenceOfflineOutbox } from "#src/realtime/presence-offline";
import {
  type Basic,
  type Precise,
  type PresenceRedis,
  indexKey,
  metadataKey,
  presenceKey,
  readOrganization,
  storeCall,
  withoutLocation,
} from "#src/realtime/presence-records";
import { PresenceSnapshots } from "#src/realtime/presence-snapshots";
import {
  PresenceNotPublished,
  PresenceSessionMismatch,
  RealtimeStoreError,
} from "#src/realtime/realtime-errors";
import { type RealtimeHub, Hub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import {
  canReadPreciseLocation,
  type PermissionViewer,
} from "#src/realtime/subscription-policy";

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

const DELTA_FLUSH_INTERVAL_MS = 250;

const REDIS_TTL_SECONDS = Math.ceil(PRESENCE_EXPIRY_MS / 1_000);

// One call refreshes every Organization of a session: KEYS 1 is the expiry
// index, then presence, metadata and Organization index per Organization.
const REFRESH_PRESENCE = `
-- presence:refresh
for key = 2, #KEYS, 3 do
  local arg = 5 + ((key - 2) / 3) * 2
  redis.call('SET', KEYS[key], ARGV[1], 'EX', ARGV[2])
  redis.call('SET', KEYS[key + 1], ARGV[3])
  if redis.call('SISMEMBER', KEYS[key + 2], ARGV[arg]) == 0 then
    redis.call('SADD', KEYS[key + 2], ARGV[arg])
  end
  redis.call('ZADD', KEYS[1], ARGV[4], ARGV[arg + 1])
end
return 1
`;

// One call removes a session from every Organization, with the same key layout.
const REMOVE_PRESENCE = `
-- presence:remove
for key = 2, #KEYS, 3 do
  local arg = 1 + ((key - 2) / 3) * 2
  redis.call('DEL', KEYS[key], KEYS[key + 1])
  redis.call('SREM', KEYS[key + 2], ARGV[arg])
  redis.call('ZREM', KEYS[1], ARGV[arg + 1])
end
return 1
`;

/**
 * Organization presence of this replica's sessions. Snapshots, deltas, expiry
 * and character departures each live in their own module; this composes them.
 */
export class PresenceStore {
  private readonly snapshots: PresenceSnapshots;

  private readonly deltas: PresenceDeltas;

  private readonly offline: PresenceOfflineOutbox;

  private readonly expiry: PresenceExpiry;

  constructor(
    private readonly redis: PresenceRedis,
    private readonly hub: Pick<RealtimeHub, "setPresence" | "publishPresence">,
    private readonly now: () => number = Date.now,
    private readonly coverage?: Pick<CoveragePublisher, "publish">,
    private readonly onlineHistory?: Pick<OnlineHistory, "observe">,
    publishOffline?: (
      event: GameCharacterOffline,
    ) => Effect.Effect<void, unknown>,
  ) {
    this.snapshots = new PresenceSnapshots(redis, now);
    this.deltas = new PresenceDeltas(redis, hub);
    this.offline = new PresenceOfflineOutbox(redis, now, publishOffline);
    this.expiry = new PresenceExpiry(redis, now, this.offline, (id, change) =>
      this.deltas.queue(id, change),
    );
  }

  publish(
    socket: GatewaySocket,
    data: typeof PublishedPresence.Type,
  ): Effect.Effect<Basic | Precise | undefined, PresenceFailure> {
    return Effect.gen({ self: this }, function* () {
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
        this.hub.setPresence(socket, undefined);
      }

      yield* this.removeFromUnselectedOrganizations(
        socket,
        selectedOrganizationIds,
        previousPresence,
      );

      if (selectedOrganizationIds.length === 0) {
        return undefined;
      }

      const basic: Basic = {
        userId: socket.data.userId,
        discordId: socket.data.discordId,
        sessionId: socket.data.connectionId,
        organizationIds: selectedOrganizationIds,
        platform: socket.data.platform,
        status: "online",
        confidence: socket.data.confidence,
        isAfk: data.isAfk ?? false,
        lastSeen: this.now(),
        character: socket.data.character ?? data.character,
      };

      const presence = data.location
        ? { ...basic, location: data.location }
        : basic;

      this.hub.setPresence(socket, presence);

      if (
        previousPresence?.character &&
        (previousPresence.character.characterId !==
          presence.character?.characterId ||
          previousPresence.character.world !== presence.character?.world)
      ) {
        yield* this.offline.schedule(previousPresence);
      }

      yield* this.refresh(
        selectedOrganizationIds,
        presence,
        socket.data.discordId,
        true,
      );

      for (const organizationId of selectedOrganizationIds) {
        yield* this.publishCoverageChange(
          socket.data.discordId,
          organizationId,
          previousPresence?.organizationIds.includes(organizationId)
            ? previousPresence
            : undefined,
          presence,
        );
      }

      yield* this.offline.cancel(presence);
      yield* (
        this.onlineHistory?.observe(socket.data, presence.lastSeen) ??
          Effect.void
      );

      return presence;
    }).pipe(
      Effect.mapError((cause) => asPresenceFailure("presence.publish", cause)),
    );
  }

  heartbeat(
    socket: GatewaySocket,
    sessionId: string,
  ): Effect.Effect<number, PresenceFailure> {
    return Effect.gen({ self: this }, function* () {
      if (sessionId !== socket.data.connectionId || !socket.data.presence) {
        return yield* Effect.fail(new PresenceSessionMismatch());
      }

      yield* this.reconcileAccess(socket);

      if (!socket.data.presence) {
        return yield* Effect.fail(new PresenceNotPublished());
      }

      const presence = { ...socket.data.presence, lastSeen: this.now() };
      this.hub.setPresence(socket, presence);

      yield* this.refresh(
        presence.organizationIds,
        presence,
        socket.data.discordId,
      );

      yield* (
        this.onlineHistory?.observe(socket.data, presence.lastSeen) ??
          Effect.void
      );

      return presence.lastSeen;
    }).pipe(
      Effect.mapError((cause) =>
        asPresenceFailure("presence.heartbeat", cause),
      ),
    );
  }

  disconnect(session: SessionData): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      yield* (
        this.onlineHistory?.observe(session, this.now(), true) ?? Effect.void
      );
      const presence = session.presence;

      if (!presence) return;

      yield* this.remove(
        presence.organizationIds,
        presence.userId,
        presence.sessionId,
        session.discordId,
      );

      yield* this.offline.schedule(presence);

      // Coverage is derived; a failed event must not keep the session online.
      if ("location" in presence && presence.location?.map && this.coverage)
        for (const organizationId of presence.organizationIds)
          yield* this.coverage.publish({
            guildId: organizationId,
            mapName: presence.location.map,
            discordId: session.discordId,
            hasPlayer: false,
            isAfk: presence.isAfk,
          });
    });
  }

  reconcileAccess(socket: GatewaySocket): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const previous = socket.data.presence;

      if (!previous) return;

      const allowedOrganizationIds = new Set(
        socket.data.guilds.map(({ guild }) => guild.id),
      );

      const retainedOrganizationIds = previous.organizationIds.filter((id) =>
        allowedOrganizationIds.has(id),
      );

      this.hub.setPresence(
        socket,
        retainedOrganizationIds.length === 0
          ? undefined
          : { ...previous, organizationIds: retainedOrganizationIds },
      );
      yield* this.removeFromUnselectedOrganizations(
        socket,
        retainedOrganizationIds,
        previous,
      );
    });
  }

  snapshot(
    viewer: PermissionViewer,
    organizationId: string,
    world?: string,
  ): Effect.Effect<typeof PresenceSnapshot.Type, PresenceFailure> {
    return Effect.gen({ self: this }, function* () {
      const { revision, presences } =
        yield* this.snapshots.read(organizationId);

      const includeLocation = canReadPreciseLocation(viewer, organizationId);

      const filtered = presences
        .filter(
          (presence) =>
            world === undefined || presence.character?.world === world,
        )
        .map((presence) => ({
          ...(includeLocation ? presence : withoutLocation(presence)),
          organizationIds: [organizationId],
        }));

      return {
        organizationId,
        world,
        revision,
        presences: filtered,
      };
    }).pipe(
      Effect.mapError((cause) => asPresenceFailure("presence.snapshot", cause)),
    );
  }

  flushDeltas(): Effect.Effect<void> {
    return Effect.suspend(() => {
      this.snapshots.prune();

      return this.deltas.flush();
    });
  }

  runDeltaFlush() {
    return this.flushDeltas().pipe(
      Effect.repeat(Schedule.spaced(DELTA_FLUSH_INTERVAL_MS)),
      // Queued removals exist nowhere else; deliver them before Redis closes.
      Effect.ensuring(
        this.flushDeltas().pipe(Effect.timeout("1 second"), Effect.ignore),
      ),
    );
  }

  runExpirySweep(): Effect.Effect<void> {
    return this.expiry.run();
  }

  sweepExpired(): Effect.Effect<void, unknown> {
    return this.expiry.sweep();
  }

  runOfflineSweep(): Effect.Effect<void> {
    return this.offline.run();
  }

  sweepOffline(): Effect.Effect<void, unknown> {
    return this.offline.sweep();
  }

  coverageForMap(
    organizationId: string,
    mapName: string,
  ): Effect.Effect<
    Array<{ readonly discordId: string; readonly isAfk: boolean }>,
    unknown
  > {
    return readOrganization(this.redis, organizationId, this.now).pipe(
      Effect.map((presences) =>
        presences.flatMap((presence) =>
          "location" in presence &&
          presence.location?.map === mapName &&
          presence.discordId
            ? [{ discordId: presence.discordId, isAfk: presence.isAfk }]
            : [],
        ),
      ),
    );
  }

  private removeFromUnselectedOrganizations(
    socket: GatewaySocket,
    selected: ReadonlyArray<string>,
    previousPresence = socket.data.presence,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const selectedSet = new Set(selected);

      const removed = (previousPresence?.organizationIds ?? []).filter(
        (organizationId) => !selectedSet.has(organizationId),
      );

      if (removed.length === 0) return;

      const cleanup = [
        this.remove(
          removed,
          socket.data.userId,
          socket.data.connectionId,
          socket.data.discordId,
        ),
      ];

      if (
        previousPresence &&
        "location" in previousPresence &&
        previousPresence.location?.map &&
        this.coverage
      ) {
        const mapName = previousPresence.location.map;

        for (const organizationId of removed)
          cleanup.push(
            this.coverage.publish({
              guildId: organizationId,
              mapName,
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
    });
  }

  // Redis commands may settle after their Effect caller is interrupted. Writes
  // queue their delta when they settle, so every stored change is announced.
  private refresh(
    organizationIds: ReadonlyArray<string>,
    presence: Basic | Precise,
    discordId: string,
    announce = false,
  ) {
    if (organizationIds.length === 0) return Effect.void;

    const keys = organizationIds.flatMap((organizationId) => [
      presenceKey(organizationId, presence.sessionId),
      metadataKey(organizationId, presence.sessionId),
      indexKey(organizationId),
    ]);

    const members = organizationIds.flatMap((organizationId) => [
      presenceKey(organizationId, presence.sessionId),
      JSON.stringify([organizationId, presence.sessionId]),
    ]);

    // Metadata lastSeen survives the payload TTL, so expiry still knows the
    // departure. A refresh restores the Organization and due indexes.
    return storeCall("presence.refresh", () =>
      this.redis.command
        .eval(
          REFRESH_PRESENCE,
          1 + keys.length,
          EXPIRY_DUE_INDEX,
          ...keys,
          JSON.stringify(presence),
          REDIS_TTL_SECONDS,
          JSON.stringify({
            userId: presence.userId,
            discordId,
            presence: withoutLocation(presence),
          }),
          presence.lastSeen + PRESENCE_EXPIRY_MS,
          ...members,
        )
        .then(() => {
          if (!announce) return;

          for (const organizationId of organizationIds)
            this.deltas.queue(organizationId, { action: "upsert", presence });
        }),
    );
  }

  private remove(
    organizationIds: ReadonlyArray<string>,
    userId: string,
    sessionId: string,
    discordId: string,
  ): Effect.Effect<void, unknown> {
    if (organizationIds.length === 0) return Effect.void;

    const keys = organizationIds.flatMap((organizationId) => [
      presenceKey(organizationId, sessionId),
      metadataKey(organizationId, sessionId),
      indexKey(organizationId),
    ]);

    const members = organizationIds.flatMap((organizationId) => [
      presenceKey(organizationId, sessionId),
      JSON.stringify([organizationId, sessionId]),
    ]);

    return storeCall("presence.remove", () =>
      this.redis.command
        .eval(
          REMOVE_PRESENCE,
          1 + keys.length,
          EXPIRY_DUE_INDEX,
          ...keys,
          ...members,
        )
        .then(() => {
          for (const organizationId of organizationIds)
            this.deltas.queue(organizationId, {
              action: "remove",
              userId,
              discordId,
              sessionId,
            });
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

/** Organization presence of this replica's sessions, with its sweeps. */
export class Presence extends Context.Service<Presence, PresenceStore>()(
  "@lootlog/gateway/realtime/Presence",
) {
  static readonly layer = Layer.effect(
    Presence,
    Effect.gen(function* () {
      const messaging = yield* RabbitMessaging;

      const presence = new PresenceStore(
        yield* GatewayRedis,
        yield* Hub,
        Date.now,
        yield* Coverage,
        yield* OnlineHistories,
        (event) =>
          messaging
            .publish({
              routingKey: RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
              content: new TextEncoder().encode(JSON.stringify(event)),
            })
            .pipe(Effect.asVoid),
      );

      yield* presence.runDeltaFlush().pipe(Effect.forkScoped);
      yield* presence.runExpirySweep().pipe(Effect.forkScoped);
      yield* presence.runOfflineSweep().pipe(Effect.forkScoped);

      return presence;
    }),
  );
}
