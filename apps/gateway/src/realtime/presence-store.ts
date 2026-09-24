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
import { yieldToEventLoop } from "#src/platform/background-tasks";
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

const OFFLINE_SWEEP_LOCK = "presence:offline:sweep-lock";

const OFFLINE_BATCH_SIZE = 100;

const OFFLINE_LEASE_MS = 30_000;

// Keep the cursor in Redis so competing replicas continue the same fair scan.
// Values are captured before reading Organizations; later departures must never
// be decided from this batch's earlier positive online observations.
const READ_OFFLINE_BATCH = `
-- presence:offline-batch
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '[]' end
local members = redis.call('LRANGE', KEYS[4], 0, tonumber(ARGV[2]) - 1)
if #members > 0 then
  redis.call('LTRIM', KEYS[4], #members, -1)
else
  local cursor = redis.call('GET', KEYS[3]) or '0'
  local page = redis.call('SSCAN', KEYS[2], cursor, 'COUNT', ARGV[2])
  redis.call('SET', KEYS[3], page[1])
  members = page[2]
end
local result = {}
for index, member in ipairs(members) do
  if index > tonumber(ARGV[2]) then redis.call('RPUSH', KEYS[4], member)
  else table.insert(result, member) end
end
if #result == 0 then return '[]' end
return cjson.encode(result)
`;

const RELEASE_OFFLINE_LEASE = `
-- presence:offline-release
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

const RENEW_OFFLINE_LEASE = `
-- presence:offline-renew
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call('PEXPIRE', KEYS[1], ARGV[2])
`;

const ACK_OFFLINE = `
-- presence:offline-ack
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('GET', KEYS[2]) ~= ARGV[2] then return 0 end
redis.call('DEL', KEYS[2])
redis.call('SREM', KEYS[3], ARGV[3])
return 1
`;

const REFRESH_PRESENCE = `
-- presence:refresh
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('SET', KEYS[2], ARGV[3])
if redis.call('SISMEMBER', KEYS[3], ARGV[4]) == 0 then
  redis.call('SADD', KEYS[3], ARGV[4])
end
if redis.call('SISMEMBER', KEYS[4], ARGV[5]) == 0 then
  redis.call('SADD', KEYS[4], ARGV[5])
end
return 1
`;

// One fresh Organization snapshot feeds one atomic group decision, with no
// per-character network waits that could make later decisions use stale data.
// Completed reconnect cancellation before this move suppresses departure; a
// reconnect after the move starts a new online period.
const CLAIM_OFFLINE = `
-- presence:offline-claim
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
local completed = 0
for key = 4, #KEYS, 3 do
  local arg = 3 + ((key - 4) / 3) * 4
  if redis.call('GET', KEYS[key]) == ARGV[arg] then
    redis.call('DEL', KEYS[key])
    redis.call('SREM', KEYS[2], ARGV[arg + 1])
    redis.call('SREM', KEYS[key + 2], ARGV[arg + 1])
    if ARGV[arg + 3] == '1' then
      redis.call('SET', KEYS[key + 1], ARGV[arg])
      redis.call('SADD', KEYS[3], ARGV[arg + 2])
    end
    completed = completed + 1
  end
end
return completed
`;

const decodeOfflineBatch = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Array(Schema.String)),
);

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
      "instanceId" | "publishPresence" | "publishToScope"
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
        yield* this.refresh(organizationId, presence, socket.data.discordId);
      }

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
    if (!this.publishOffline) return Effect.void;

    return Effect.suspend(() => {
      const token = crypto.randomUUID();

      return Effect.acquireUseRelease(
        fromPromise("presence.offline-lease", () =>
          this.redis.command.set(
            OFFLINE_SWEEP_LOCK,
            token,
            "PX",
            OFFLINE_LEASE_MS,
            "NX",
          ),
        ),
        (acquired) =>
          acquired === "OK" ? this.drainOffline(token) : Effect.void,
        (acquired) =>
          acquired === "OK"
            ? fromPromise("presence.offline-release", () =>
                this.redis.command.eval(
                  RELEASE_OFFLINE_LEASE,
                  1,
                  OFFLINE_SWEEP_LOCK,
                  token,
                ),
              ).pipe(Effect.ignore)
            : Effect.void,
      );
    });
  }

  private drainOffline(token: string) {
    return Effect.gen({ self: this }, function* () {
      const deadline = performance.now() + 1_000;

      do {
        const completed = yield* this.sweepOfflineBatch(token);

        if (completed === 0) return;
        yield* yieldToEventLoop;
      } while (performance.now() < deadline);
    });
  }

  private readOfflineBatch(index: string, token: string) {
    return Effect.gen({ self: this }, function* () {
      const raw = yield* fromPromise("presence.offline-batch", () =>
        this.redis.command.eval<string>(
          READ_OFFLINE_BATCH,
          4,
          OFFLINE_SWEEP_LOCK,
          index,
          `${index}:cursor`,
          `${index}:overflow`,
          token,
          OFFLINE_BATCH_SIZE,
        ),
      );

      const keys = decodeOfflineBatch(raw);

      if (keys.length === 0) return [];

      // Dragonfly scripts may only access declared keys. Capture the bounded
      // values together before any Organization read; claims compare them again.
      const values = yield* fromPromise("presence.offline-batch-values", () =>
        this.redis.command.mget([...keys]),
      );

      const pending: Array<readonly [string, string]> = [];
      const missing: string[] = [];

      for (const [position, key] of keys.entries()) {
        const value = values[position];

        if (value) pending.push([key, value]);
        else missing.push(key);
      }

      if (missing.length > 0)
        yield* fromPromise("presence.offline-unindex", () =>
          this.redis.command.srem(index, ...missing),
        );

      return pending;
    });
  }

  private sweepOfflineBatch(token: string): Effect.Effect<number, unknown> {
    return Effect.gen({ self: this }, function* () {
      let completed = 0;

      const pending = yield* this.readOfflineBatch(
        OFFLINE_PENDING_INDEX,
        token,
      );

      const groups = Map.groupBy(
        pending
          .map(([key, value]) => ({ key, value, event: decodeOffline(value) }))
          .filter(({ event }) => this.now() - event.disconnectedAt >= 10_000),
        ({ event }) =>
          JSON.stringify([...new Set(event.organizationIds)].sort()),
      );

      for (const group of groups.values()) {
        const first = group[0];

        if (!first) continue;
        const online = new Set<string>();

        // Read each group immediately before its single bounded claim. Never
        // retain these observations across another group's Redis round trip.
        for (const organizationId of new Set(first.event.organizationIds)) {
          const presences = yield* this.readOrganization(organizationId);

          for (const presence of presences) {
            if (presence.platform === "game" && presence.character)
              online.add(this.offlineCharacterKey(presence));
          }
        }

        const keys = [
          OFFLINE_SWEEP_LOCK,
          OFFLINE_PENDING_INDEX,
          OFFLINE_OUTBOX_INDEX,
        ];

        const args: Array<string | number> = [token, OFFLINE_LEASE_MS];

        for (const { key, value, event } of group) {
          const outboxKey = `${key}:decided`;

          const characterKey = this.offlineCharacterKey({
            userId: event.userId,
            character: { world: event.world, characterId: event.characterId },
          });

          keys.push(key, outboxKey, characterKey);
          args.push(
            value,
            key,
            outboxKey,
            online.has(characterKey) ? "0" : "1",
          );
        }

        const claimed = yield* fromPromise("presence.offline-claim", () =>
          this.redis.command.eval<number>(
            CLAIM_OFFLINE,
            keys.length,
            ...keys,
            ...args,
          ),
        );

        if (claimed === -1) return 0;

        completed += claimed;
      }

      const outbox = yield* this.readOfflineBatch(OFFLINE_OUTBOX_INDEX, token);

      for (const [key, value] of outbox) {
        const renewed = yield* fromPromise("presence.offline-renew", () =>
          this.redis.command.eval<number>(
            RENEW_OFFLINE_LEASE,
            1,
            OFFLINE_SWEEP_LOCK,
            token,
            OFFLINE_LEASE_MS,
          ),
        );

        if (!renewed) return 0;

        if (this.publishOffline)
          yield* this.publishOffline(decodeOffline(value)).pipe(
            Effect.timeout("10 seconds"),
          );
        completed++;
        yield* fromPromise("presence.offline-outbox-complete", () =>
          this.redis.command.eval(
            ACK_OFFLINE,
            3,
            OFFLINE_SWEEP_LOCK,
            key,
            OFFLINE_OUTBOX_INDEX,
            token,
            value,
            key,
          ),
        );
      }

      return completed;
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

  private refresh(
    organizationId: string,
    presence: Basic | Precise,
    discordId: string,
  ) {
    const key = this.presenceKey(organizationId, presence.sessionId);

    // Metadata lastSeen survives TTL expiry; both indexes recover independently
    // after partial eviction as well as after complete Redis loss.
    return this.mutateOrganization(organizationId, "presence.refresh", () =>
      this.redis.command.eval(
        REFRESH_PRESENCE,
        4,
        key,
        this.metadataKey(organizationId, presence.sessionId),
        this.indexKey(organizationId),
        "presence:organizations",
        JSON.stringify(presence),
        REDIS_TTL_SECONDS,
        JSON.stringify({
          userId: presence.userId,
          discordId,
          presence: withoutLocation(presence),
        }),
        key,
        organizationId,
      ),
    );
  }

  private writeMetadata(
    organizationId: string,
    presence: Basic | Precise,
    discordId: string,
  ) {
    return this.mutateOrganization(
      organizationId,
      "presence.write-metadata",
      () =>
        this.redis.command.set(
          this.metadataKey(organizationId, presence.sessionId),
          JSON.stringify({
            userId: presence.userId,
            discordId,
            presence: withoutLocation(presence),
          }),
        ),
    );
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
        this.writeMetadata(organizationId, presence, discordId),
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

      const basicEvent = makeEvent(withoutLocation(presence));

      const preciseEvent =
        "location" in presence ? makeEvent(presence) : basicEvent;

      yield* fromPromise("presence.publish-upsert", () =>
        this.hub.publishPresence(
          { topic: "organization.presence", organizationId },
          basicEvent,
          preciseEvent,
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
