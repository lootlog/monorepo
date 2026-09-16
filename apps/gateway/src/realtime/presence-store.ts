import { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import type { OnlineHistory } from "./online-history.js";
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
import { Deferred, Effect, Schedule, Schema } from "effect";
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

const OFFLINE_PENDING_INDEX = "presence:offline:pending";

const OFFLINE_OUTBOX_INDEX = "presence:offline:outbox";

// The atomic move is the departure decision. A reconnect before it cancels the
// pending record; a reconnect after it starts a new online period.
const CLAIM_OFFLINE = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[3], ARGV[2])
redis.call('SREM', KEYS[4], ARGV[2])
if ARGV[4] == '1' then
  redis.call('SET', KEYS[2], ARGV[1])
  redis.call('SADD', KEYS[5], ARGV[3])
end
return 1
`;

const decodeOffline = Schema.decodeUnknownSync(
  Schema.fromJsonString(GameCharacterOffline),
);

const REDIS_TTL_SECONDS = Math.ceil(PRESENCE_EXPIRY_MS / 1_000);

const SWEEP_INTERVAL_MS = 5_000;

const PresenceJson = Schema.fromJsonString(
  Schema.Union([PresenceWithLocation, BasicPresence]),
);

const PresenceMetadataJson = Schema.fromJsonString(
  Schema.Struct({
    userId: Schema.String,
    discordId: Schema.String,
    presence: Schema.optional(BasicPresence),
  }),
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
  if (!("location" in presence)) return presence;
  const { location: _location, ...basic } = presence;

  return basic;
};

export class PresenceStore {
  private readonly pendingSnapshots = new Map<
    string,
    Deferred.Deferred<Array<Basic | Precise>, unknown>
  >();

  constructor(
    private readonly redis: {
      readonly command: Pick<
        RedisGatewayStore["command"],
        | "get"
        | "set"
        | "del"
        | "sadd"
        | "srem"
        | "smembers"
        | "mget"
        | "incr"
        | "eval"
      >;
    },
    private readonly hub: Pick<
      RealtimeHub,
      "instanceId" | "publishPresence" | "publishToScope" | "refreshRegistry"
    >,
    private readonly now: () => number = Date.now,
    private readonly coverage?: Pick<CoveragePublisher, "publish">,
    private readonly onlineHistory?: Pick<OnlineHistory, "observe">,
    private readonly publishOffline?: (
      event: GameCharacterOffline,
    ) => Effect.Effect<void, unknown>,
  ) {}

  readonly sweepSchedule = SWEEP_INTERVAL_MS;

  publish(
    socket: GatewaySocket,
    data: Published,
  ): Effect.Effect<Basic | Precise | undefined, PresenceFailure> {
    return Effect.gen({ self: this }, function* () {
      // Publication opt-out is temporarily disabled; keep the wire field for compatibility.
      const selectedOrganizationIds = [
        ...new Set(socket.data.guilds.map(({ guild }) => guild.id)),
      ];

      const previousPresence = socket.data.presence;

      if (selectedOrganizationIds.length === 0) {
        socket.data.presence = undefined;
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

      socket.data.presence = presence;

      if (
        previousPresence?.character &&
        (previousPresence.character.characterId !==
          presence.character?.characterId ||
          previousPresence.character.world !== presence.character?.world)
      ) {
        yield* this.scheduleOffline(previousPresence);
      }

      for (const organizationId of selectedOrganizationIds) {
        yield* this.write(organizationId, presence, socket.data.discordId);
        yield* this.broadcastUpsert(organizationId, presence);
        yield* this.publishCoverageChange(
          socket.data.discordId,
          organizationId,
          previousPresence?.organizationIds.includes(organizationId)
            ? previousPresence
            : undefined,
          presence,
        );
      }

      yield* this.cancelOffline(presence);
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
      socket.data.presence = presence;

      for (const organizationId of presence.organizationIds) {
        yield* this.write(organizationId, presence, socket.data.discordId);
      }

      yield* fromPromise("presence.refresh-registry", () =>
        this.hub.refreshRegistry(socket.data),
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

      for (const organizationId of presence.organizationIds) {
        if ("location" in presence && presence.location?.map) {
          if (this.coverage)
            yield* this.coverage.publish({
              guildId: organizationId,
              mapName: presence.location.map,
              discordId: session.discordId,
              hasPlayer: false,
              isAfk: presence.isAfk,
            });
        }

        yield* this.remove(
          organizationId,
          presence.userId,
          presence.sessionId,
          session.discordId,
        );
      }

      yield* this.scheduleOffline(presence);
    });
  }

  private offlineCharacterKey(presence: {
    userId: string;
    character?: { characterId: string; world: string };
  }): string {
    return `presence:offline:character:${JSON.stringify([presence.userId, presence.character?.world, presence.character?.characterId])}`;
  }

  private cancelOffline(
    presence: Basic | Precise,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      if (presence.platform !== "game" || !presence.character) return;
      const index = this.offlineCharacterKey(presence);

      const keys = yield* fromPromise("presence.offline-list", () =>
        this.redis.command.smembers(index),
      );

      for (const key of keys) {
        yield* fromPromise("presence.offline-cancel", () =>
          this.redis.command.del(key),
        );
        yield* fromPromise("presence.offline-unindex", () =>
          this.redis.command.srem(OFFLINE_PENDING_INDEX, key),
        );
        yield* fromPromise("presence.offline-character-unindex", () =>
          this.redis.command.srem(index, key),
        );
      }
    });
  }

  private scheduleOffline(
    presence: Basic | Precise,
    disconnectedAt = this.now(),
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      if (
        !this.publishOffline ||
        presence.platform !== "game" ||
        !presence.character ||
        !presence.discordId
      )
        return;

      const pendingKeys = yield* fromPromise("presence.offline-existing", () =>
        this.redis.command.smembers(this.offlineCharacterKey(presence)),
      );

      if (pendingKeys.length > 0) {
        const pendingValues = yield* fromPromise(
          "presence.offline-existing-read",
          () => this.redis.command.mget(pendingKeys),
        );

        if (
          pendingValues.some(
            (value) =>
              value !== null &&
              decodeOffline(value).disconnectedAt > disconnectedAt,
          )
        )
          return;
      }

      yield* this.cancelOffline(presence);

      const event: GameCharacterOffline = {
        userId: presence.userId,
        discordId: presence.discordId,
        world: presence.character.world,
        characterId: presence.character.characterId,
        organizationIds: presence.organizationIds,
        disconnectedAt,
      };

      const key = `${this.offlineCharacterKey(presence)}:session:${presence.sessionId}:${crypto.randomUUID()}`;
      yield* fromPromise("presence.offline-schedule", () =>
        this.redis.command.set(key, JSON.stringify(event)),
      );
      yield* fromPromise("presence.offline-index", () =>
        this.redis.command.sadd(OFFLINE_PENDING_INDEX, key),
      );
      yield* fromPromise("presence.offline-character-index", () =>
        this.redis.command.sadd(this.offlineCharacterKey(presence), key),
      );
    });
  }

  runOfflineSweep() {
    return this.sweepOffline().pipe(
      Effect.catch((error) =>
        Effect.logError("Character offline sweep failed; retrying", error),
      ),
      Effect.repeat(Schedule.spaced(1_000)),
    );
  }

  sweepOffline(): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      if (!this.publishOffline) return;

      const keys = yield* fromPromise("presence.offline-pending", () =>
        this.redis.command.smembers(OFFLINE_PENDING_INDEX),
      );

      for (const key of keys) {
        const value = yield* fromPromise("presence.offline-read", () =>
          this.redis.command.get(key),
        );

        if (!value) {
          yield* fromPromise("presence.offline-unindex", () =>
            this.redis.command.srem(OFFLINE_PENDING_INDEX, key),
          );
          continue;
        }

        const event = decodeOffline(value);

        if (this.now() - event.disconnectedAt < 10_000) continue;
        let online = false;

        for (const organizationId of event.organizationIds) {
          const presences = yield* this.readOrganization(organizationId);
          online ||= presences.some(
            (presence) =>
              presence.platform === "game" &&
              presence.userId === event.userId &&
              presence.character?.world === event.world &&
              presence.character.characterId === event.characterId,
          );
        }

        const outboxKey = `${key}:decided`;
        yield* fromPromise("presence.offline-claim", () =>
          this.redis.command.eval(
            CLAIM_OFFLINE,
            5,
            key,
            outboxKey,
            OFFLINE_PENDING_INDEX,
            this.offlineCharacterKey({
              userId: event.userId,
              character: { world: event.world, characterId: event.characterId },
            }),
            OFFLINE_OUTBOX_INDEX,
            value,
            key,
            outboxKey,
            online ? "0" : "1",
          ),
        );
      }

      const outboxKeys = yield* fromPromise("presence.offline-outbox", () =>
        this.redis.command.smembers(OFFLINE_OUTBOX_INDEX),
      );

      for (const key of outboxKeys) {
        const value = yield* fromPromise("presence.offline-outbox-read", () =>
          this.redis.command.get(key),
        );

        if (value) {
          yield* this.publishOffline(decodeOffline(value));
          yield* fromPromise("presence.offline-outbox-complete", () =>
            this.redis.command.del(key),
          );
        }

        yield* fromPromise("presence.offline-outbox-unindex", () =>
          this.redis.command.srem(OFFLINE_OUTBOX_INDEX, key),
        );
      }
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

      socket.data.presence =
        retainedOrganizationIds.length === 0
          ? undefined
          : { ...previous, organizationIds: retainedOrganizationIds };
      yield* this.removeFromUnselectedOrganizations(
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
    return Effect.gen({ self: this }, function* () {
      const presences = yield* this.readSnapshotOrganization(organizationId);
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
        revision: yield* this.getRevision(organizationId),
        presences: filtered,
      };
    }).pipe(
      Effect.mapError((cause) => asPresenceFailure("presence.snapshot", cause)),
    );
  }

  runExpirySweep() {
    return this.sweepExpired().pipe(
      Effect.catch((error) =>
        Effect.logError("Presence expiry sweep failed; retrying", error),
      ),
      Effect.repeat(Schedule.spaced(this.sweepSchedule)),
    );
  }

  sweepExpired(): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const organizations = yield* fromPromise(
        "presence.list-organizations",
        () => this.redis.command.smembers("presence:organizations"),
      );

      for (const organizationId of organizations) {
        const lock = yield* fromPromise("presence.acquire-sweep-lock", () =>
          this.redis.command.set(
            `presence:sweep-lock:${organizationId}`,
            this.hub.instanceId,
            "EX",
            10,
            "NX",
          ),
        );

        if (lock !== "OK") continue;

        const keys = yield* fromPromise("presence.list-organization", () =>
          this.redis.command.smembers(this.indexKey(organizationId)),
        );

        if (keys.length === 0) continue;

        const values = yield* fromPromise("presence.read-organization", () =>
          this.redis.command.mget(keys),
        );

        for (const [index, value] of values.entries()) {
          const key = keys[index];

          if (!key) continue;
          let expired = value === null;

          if (value) {
            try {
              const presence = decodePresence(value);
              expired = this.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS;
            } catch {
              expired = true;
            }
          }

          if (!expired) continue;
          const sessionId = key.slice(key.lastIndexOf(":") + 1);
          const metadata = yield* this.readMetadata(organizationId, sessionId);
          const userId = metadata?.userId;

          if (metadata?.presence) {
            yield* this.scheduleOffline(
              metadata.presence,
              metadata.presence.lastSeen + PRESENCE_EXPIRY_MS,
            );
          }

          if (userId)
            yield* this.remove(
              organizationId,
              userId,
              sessionId,
              metadata.discordId,
            );
          else
            yield* this.mutateOrganization(
              organizationId,
              "presence.remove-stale-index",
              () => this.redis.command.srem(this.indexKey(organizationId), key),
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
    return Effect.gen({ self: this }, function* () {
      const presences = (yield* this.readOrganization(organizationId)).filter(
        (presence) =>
          "location" in presence && presence.location?.map === mapName,
      );

      if (presences.length === 0) return [];

      const values = yield* fromPromise("presence.read-metadata", () =>
        this.redis.command.mget(
          presences.map((presence) =>
            this.metadataKey(organizationId, presence.sessionId),
          ),
        ),
      );

      const result: Array<{
        readonly discordId: string;
        readonly isAfk: boolean;
      }> = [];

      for (const [index, presence] of presences.entries()) {
        const value = values[index];

        if (!value) continue;

        try {
          const metadata = decodePresenceMetadata(value);
          result.push({ discordId: metadata.discordId, isAfk: presence.isAfk });
        } catch {
          continue;
        }
      }

      return result;
    });
  }

  private removeFromUnselectedOrganizations(
    socket: GatewaySocket,
    selected: ReadonlyArray<string>,
    previousPresence = socket.data.presence,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const previous = previousPresence?.organizationIds ?? [];
      const selectedSet = new Set(selected);

      for (const organizationId of previous) {
        if (!selectedSet.has(organizationId)) {
          const cleanup = [
            this.remove(
              organizationId,
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
            cleanup.push(
              this.coverage.publish({
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
        this.mutateOrganization(organizationId, "presence.write", () =>
          this.redis.command.set(
            key,
            JSON.stringify(presence),
            "EX",
            REDIS_TTL_SECONDS,
          ),
        ),
        this.mutateOrganization(organizationId, "presence.index", () =>
          this.redis.command.sadd(this.indexKey(organizationId), key),
        ),
        fromPromise("presence.register-organization", () =>
          this.redis.command.sadd("presence:organizations", organizationId),
        ),
        this.mutateOrganization(organizationId, "presence.write-metadata", () =>
          this.redis.command.set(
            this.metadataKey(organizationId, presence.sessionId),
            JSON.stringify({
              userId: presence.userId,
              discordId,
              presence: withoutLocation(presence),
            }),
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
    discordId: string,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const key = this.presenceKey(organizationId, sessionId);
      yield* Effect.all(
        [
          this.mutateOrganization(organizationId, "presence.remove", () =>
            this.redis.command.del(key),
          ),
          this.mutateOrganization(
            organizationId,
            "presence.remove-metadata",
            () =>
              this.redis.command.del(
                this.metadataKey(organizationId, sessionId),
              ),
          ),
          this.mutateOrganization(organizationId, "presence.remove-index", () =>
            this.redis.command.srem(this.indexKey(organizationId), key),
          ),
        ],
        { concurrency: "unbounded", discard: true },
      );
      const revision = yield* this.nextRevision(organizationId);

      const event = {
        v: 1,
        type: "presence.delta",
        sequence: revision,
        data: {
          organizationId,
          revision,
          changes: [{ action: "remove", userId, discordId, sessionId }],
        },
      } satisfies Event;

      yield* fromPromise("presence.publish-remove", () =>
        this.hub.publishToScope(
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
    return Effect.gen({ self: this }, function* () {
      const revision = yield* this.nextRevision(organizationId);

      const makeEvent = (value: Basic | Precise) =>
        ({
          v: 1,
          type: "presence.delta",
          sequence: revision,
          data: {
            organizationId,
            revision,
            changes: [
              {
                action: "upsert",
                presence: { ...value, organizationIds: [organizationId] },
              },
            ],
          },
        }) satisfies Event;

      yield* fromPromise("presence.publish-upsert", () =>
        this.hub.publishPresence(
          { topic: "organization.presence", organizationId },
          makeEvent(withoutLocation(presence)),
          makeEvent(presence),
        ),
      );
    });
  }

  private readSnapshotOrganization(
    organizationId: string,
  ): Effect.Effect<Array<Basic | Precise>, unknown> {
    // Offline decisions and coverage require their own fresh read.
    return Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        const pending = this.pendingSnapshots.get(organizationId);

        if (pending) return restore(Deferred.await(pending));

        const result = Deferred.makeUnsafe<Array<Basic | Precise>, unknown>();
        this.pendingSnapshots.set(organizationId, result);

        // Redis reads outlive individual viewers. A disconnect must not cancel
        // another viewer's read; retain the entry only until the producer settles.
        const read = this.readOrganization(organizationId).pipe(
          Effect.timeout("10 seconds"),
          Effect.ensuring(
            Effect.sync(() => {
              if (this.pendingSnapshots.get(organizationId) === result) {
                this.pendingSnapshots.delete(organizationId);
              }
            }),
          ),
        );

        return Deferred.complete(result, read).pipe(
          Effect.forkDetach,
          Effect.andThen(restore(Deferred.await(result))),
        );
      }),
    );
  }

  private readOrganization(
    organizationId: string,
  ): Effect.Effect<Array<Basic | Precise>, unknown> {
    return Effect.gen({ self: this }, function* () {
      const keys = yield* fromPromise("presence.list-organization", () =>
        this.redis.command.smembers(this.indexKey(organizationId)),
      );

      if (keys.length === 0) return [];

      const values = yield* fromPromise("presence.read-organization", () =>
        this.redis.command.mget(keys),
      );

      const presences: Array<Basic | Precise> = [];

      for (const value of values) {
        if (!value) {
          continue;
        }

        try {
          const presence = decodePresence(value);

          if (this.now() - presence.lastSeen >= PRESENCE_EXPIRY_MS) {
            continue;
          } else {
            const discordId =
              presence.discordId ??
              (yield* this.readMetadata(organizationId, presence.sessionId))
                ?.discordId;

            presences.push(discordId ? { ...presence, discordId } : presence);
          }
        } catch {
          continue;
        }
      }

      return presences;
    });
  }

  private nextRevision(organizationId: string): Effect.Effect<number, unknown> {
    return this.mutateOrganization(
      organizationId,
      "presence.next-revision",
      () => this.redis.command.incr(`presence:revision:${organizationId}`),
    );
  }

  private mutateOrganization<A>(
    organizationId: string,
    operation: string,
    evaluate: () => Promise<A>,
  ): Effect.Effect<A, RealtimeStoreError> {
    // Redis commands may settle after their Effect caller is interrupted.
    return fromPromise(operation, () =>
      evaluate().finally(() => {
        this.pendingSnapshots.delete(organizationId);
      }),
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
    {
      readonly userId: string;
      readonly discordId: string;
      readonly presence?: Basic;
    } | null,
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
