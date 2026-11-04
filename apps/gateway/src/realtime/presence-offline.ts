import { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Effect, Option, Schedule, Schema } from "effect";
import { yieldToEventLoop } from "#src/platform/background-tasks";
import {
  type Basic,
  type Precise,
  type PresenceRedis,
  decodeStoredKeys,
  readOrganization,
  releaseLease,
  storeCall,
} from "#src/realtime/presence-records";

type OfflineRecord = {
  readonly key: string;
  readonly value: string;
  readonly event: GameCharacterOffline;
};

type Departing = {
  readonly userId: string;
  readonly character?: { readonly characterId: string; readonly world: string };
};

export const OFFLINE_DUE_INDEX = "presence:offline:due";

const OFFLINE_OUTBOX_INDEX = "presence:offline:outbox";

const OFFLINE_SWEEP_LOCK = "presence:offline:sweep-lock";

const OFFLINE_BATCH_SIZE = 100;

const OFFLINE_LEASE_MS = 30_000;

// A reconnect within this grace period cancels the departure.
const OFFLINE_GRACE_MS = 10_000;

// Departure keys are their own index members. Lua receives the keys prefixed,
// so the members of the departures a reconnect or a newer departure
// supersedes follow as arguments, starting at `firstMember`.
const cancelDepartures = (index: number, due: number, firstMember: number) => `
for key = ${due + 1}, #KEYS do
  local member = ARGV[key - ${due + 1} + ${firstMember}]
  redis.call('DEL', KEYS[key])
  redis.call('SREM', KEYS[${index}], member)
  redis.call('ZREM', KEYS[${due}], member)
end`;

const CANCEL_OFFLINE = `
-- presence:offline-cancel
${cancelDepartures(1, 2, 1)}
return 1
`;

const SCHEDULE_OFFLINE = `
-- presence:offline-schedule
${cancelDepartures(2, 3, 4)}
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SADD', KEYS[2], ARGV[2])
redis.call('ZADD', KEYS[3], ARGV[3], ARGV[2])
return 1
`;

const READ_OFFLINE_READY = `
-- presence:offline-ready
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '[]' end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
local keys
if ARGV[3] == 'due' then
  keys = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[4], 'LIMIT', 0, ARGV[5])
else
  keys = redis.call('SRANDMEMBER', KEYS[2], ARGV[5])
end
if #keys == 0 then return '[]' end
return cjson.encode(keys)
`;

// Compare captured values so cleanup cannot discard a replacement departure.
const DROP_OFFLINE = `
-- presence:offline-drop
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
if redis.call('GET', KEYS[2]) ~= ARGV[2] and not (ARGV[2] == '' and redis.call('EXISTS', KEYS[2]) == 0) then return 0 end
redis.call('DEL', KEYS[2])
redis.call('ZREM', KEYS[3], ARGV[3])
redis.call('SREM', KEYS[4], ARGV[3])
return 1
`;

const RENEW_OFFLINE_LEASE = `
-- presence:offline-renew
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call('PEXPIRE', KEYS[1], ARGV[2])
`;

const ACK_OFFLINE = `
-- presence:offline-ack
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return -1 end
redis.call('PEXPIRE', KEYS[1], ARGV[4])
if redis.call('GET', KEYS[2]) ~= ARGV[2] then return 0 end
redis.call('DEL', KEYS[2])
redis.call('SREM', KEYS[3], ARGV[3])
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
    redis.call('ZREM', KEYS[3], ARGV[arg + 1])
    redis.call('SREM', KEYS[key + 2], ARGV[arg + 1])
    if ARGV[arg + 3] == '1' then
      redis.call('SET', KEYS[key + 1], ARGV[arg])
      redis.call('SADD', KEYS[2], ARGV[arg + 2])
    end
    completed = completed + 1
  end
end
return completed
`;

const decodeOffline = Schema.decodeUnknownOption(
  Schema.fromJsonString(GameCharacterOffline),
);

export const offlineCharacterKey = (presence: Departing): string =>
  `presence:offline:character:${JSON.stringify([presence.userId, presence.character?.world, presence.character?.characterId])}`;

/**
 * Durable game character departures: scheduled when a session leaves, cancelled
 * by a reconnect within the grace period, and published from an outbox.
 */
export class PresenceOfflineOutbox {
  constructor(
    private readonly redis: PresenceRedis,
    private readonly now: () => number,
    private readonly publish?: (
      event: GameCharacterOffline,
    ) => Effect.Effect<void, unknown>,
  ) {}

  cancel(presence: Basic | Precise): Effect.Effect<void, unknown> {
    if (presence.platform !== "game" || !presence.character) return Effect.void;
    const index = offlineCharacterKey(presence);

    return storeCall("presence.offline-list", () =>
      this.redis.command.smembers(index),
    ).pipe(
      Effect.flatMap((keys) =>
        keys.length === 0
          ? Effect.void
          : storeCall("presence.offline-cancel", () =>
              this.redis.command.eval(
                CANCEL_OFFLINE,
                2 + keys.length,
                index,
                OFFLINE_DUE_INDEX,
                ...keys,
                ...keys,
              ),
            ),
      ),
    );
  }

  schedule(
    presence: Basic | Precise,
    disconnectedAt = this.now(),
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const event = this.event(presence, disconnectedAt);

      if (!event) return;

      const pending = yield* this.readPending(presence, disconnectedAt);

      if (pending.hasNewerDeparture) return;

      const index = offlineCharacterKey(presence);
      const key = `${index}:session:${presence.sessionId}:${crypto.randomUUID()}`;
      yield* storeCall("presence.offline-schedule", () =>
        this.redis.command.eval(
          SCHEDULE_OFFLINE,
          3 + pending.keys.length,
          key,
          index,
          OFFLINE_DUE_INDEX,
          ...pending.keys,
          JSON.stringify(event),
          key,
          disconnectedAt + OFFLINE_GRACE_MS,
          ...pending.keys,
        ),
      );
    });
  }

  /**
   * The keys and arguments that let an expiry removal schedule the departure
   * atomically: the new departure, its character index, the due index, and the
   * departures it supersedes, whose captured values must still match.
   */
  prepareExpiryDeparture(presence: Basic | undefined): Effect.Effect<
    {
      readonly keys: ReadonlyArray<string>;
      readonly args: ReadonlyArray<string | number>;
    },
    unknown
  > {
    return Effect.gen({ self: this }, function* () {
      const skip = { keys: [], args: [] };

      if (!presence) return skip;

      const event = this.event(
        presence,
        presence.lastSeen + PRESENCE_EXPIRY_MS,
      );

      if (!event) return skip;
      const index = offlineCharacterKey(presence);

      const pending = yield* this.readPending(presence, event.disconnectedAt);

      if (pending.hasNewerDeparture) return skip;
      const key = `${index}:session:${presence.sessionId}:${crypto.randomUUID()}`;

      return {
        keys: [key, index, OFFLINE_DUE_INDEX, ...pending.keys],
        args: [
          JSON.stringify(event),
          key,
          event.disconnectedAt + OFFLINE_GRACE_MS,
          ...pending.values.map((value) => value ?? ""),
          ...pending.keys,
        ],
      };
    });
  }

  run(): Effect.Effect<void> {
    return this.sweep().pipe(
      Effect.catch((error) =>
        Effect.logError("Character offline sweep failed; retrying", error),
      ),
      Effect.repeat(Schedule.spaced(1_000)),
      Effect.asVoid,
    );
  }

  sweep(): Effect.Effect<void, unknown> {
    const publish = this.publish;

    if (!publish) return Effect.void;

    return Effect.suspend(() => {
      const token = crypto.randomUUID();

      // Acquisition remains interruptible during Redis failover. An orphaned
      // lease expires; cleanup gets a bounded attempt when closing the scope.
      return storeCall("presence.offline-lease", () =>
        this.redis.command.set(
          OFFLINE_SWEEP_LOCK,
          token,
          "PX",
          OFFLINE_LEASE_MS,
          "NX",
        ),
      ).pipe(
        Effect.flatMap((acquired) =>
          acquired === "OK"
            ? this.drain(token, publish).pipe(
                Effect.ensuring(
                  releaseLease(
                    this.redis,
                    "presence.offline-release",
                    OFFLINE_SWEEP_LOCK,
                    token,
                  ),
                ),
              )
            : Effect.void,
        ),
      );
    });
  }

  private event(
    presence: Basic | Precise,
    disconnectedAt: number,
  ): GameCharacterOffline | undefined {
    if (
      !this.publish ||
      presence.platform !== "game" ||
      !presence.character ||
      !presence.discordId
    )
      return;

    return {
      userId: presence.userId,
      discordId: presence.discordId,
      world: presence.character.world,
      characterId: presence.character.characterId,
      organizationIds: presence.organizationIds,
      disconnectedAt,
    };
  }

  private readPending = Effect.fnUntraced(function* (
    this: PresenceOfflineOutbox,
    presence: Departing,
    disconnectedAt: number,
  ) {
    const keys = yield* storeCall("presence.offline-existing", () =>
      this.redis.command.smembers(offlineCharacterKey(presence)),
    );

    const values =
      keys.length === 0
        ? []
        : yield* storeCall("presence.offline-existing-read", () =>
            this.redis.command.mget(keys),
          );

    return {
      keys,
      values,
      hasNewerDeparture: values.some((value) => {
        const event = decodeOffline(value);

        return (
          Option.isSome(event) && event.value.disconnectedAt > disconnectedAt
        );
      }),
    };
  });

  private drain = Effect.fnUntraced(function* (
    this: PresenceOfflineOutbox,
    token: string,
    publish: NonNullable<PresenceOfflineOutbox["publish"]>,
  ) {
    const deadline = performance.now() + 1_000;

    do {
      if ((yield* this.sweepBatch(token, publish)) <= 0) return;
      yield* yieldToEventLoop;
    } while (performance.now() < deadline);
  });

  private readValues = Effect.fnUntraced(function* (
    this: PresenceOfflineOutbox,
    keys: readonly string[],
    token: string,
  ) {
    if (keys.length === 0) return [];

    // Dragonfly scripts may only access declared keys. Capture bounded values
    // before Organization reads; claims and invalid-record cleanup compare them.
    const values = yield* storeCall("presence.offline-batch-values", () =>
      this.redis.command.mget([...keys]),
    );

    const records: OfflineRecord[] = [];

    for (const [position, key] of keys.entries()) {
      const value = values[position];
      const event = decodeOffline(value);

      if (value !== null && value !== undefined && Option.isSome(event)) {
        records.push({ key, value, event: event.value });
      } else {
        yield* storeCall("presence.offline-drop-invalid", () =>
          this.redis.command.eval(
            DROP_OFFLINE,
            4,
            OFFLINE_SWEEP_LOCK,
            key,
            OFFLINE_DUE_INDEX,
            OFFLINE_OUTBOX_INDEX,
            token,
            value ?? "",
            key,
          ),
        );
      }
    }

    return records;
  });

  private readReady = Effect.fnUntraced(function* (
    this: PresenceOfflineOutbox,
    queue: "due" | "outbox",
    token: string,
  ) {
    const raw = yield* storeCall("presence.offline-ready", () =>
      this.redis.command.eval<string>(
        READ_OFFLINE_READY,
        2,
        OFFLINE_SWEEP_LOCK,
        queue === "due" ? OFFLINE_DUE_INDEX : OFFLINE_OUTBOX_INDEX,
        token,
        OFFLINE_LEASE_MS,
        queue,
        this.now(),
        OFFLINE_BATCH_SIZE,
      ),
    );

    return yield* this.readValues(yield* decodeStoredKeys(raw), token);
  });

  private sweepBatch = Effect.fnUntraced(function* (
    this: PresenceOfflineOutbox,
    token: string,
    publish: NonNullable<PresenceOfflineOutbox["publish"]>,
  ) {
    let completed = 0;
    const due = yield* this.readReady("due", token);

    const groups = Map.groupBy(due, ({ event }) =>
      JSON.stringify([...new Set(event.organizationIds)].sort()),
    );

    for (const group of groups.values()) {
      const first = group[0];

      if (!first) continue;
      const online = new Set<string>();

      // Read each group immediately before its single bounded claim. Never
      // retain these observations across another group's Redis round trip.
      for (const organizationId of new Set(first.event.organizationIds)) {
        const presences = yield* readOrganization(
          this.redis,
          organizationId,
          this.now,
        );

        for (const presence of presences) {
          if (presence.platform === "game" && presence.character)
            online.add(offlineCharacterKey(presence));
        }
      }

      const keys = [
        OFFLINE_SWEEP_LOCK,
        OFFLINE_OUTBOX_INDEX,
        OFFLINE_DUE_INDEX,
      ];

      const args: Array<string | number> = [token, OFFLINE_LEASE_MS];

      for (const { key, value, event } of group) {
        const outboxKey = `${key}:decided`;

        const characterKey = offlineCharacterKey({
          userId: event.userId,
          character: { world: event.world, characterId: event.characterId },
        });

        keys.push(key, outboxKey, characterKey);
        args.push(value, key, outboxKey, online.has(characterKey) ? "0" : "1");
      }

      const claimed = yield* storeCall("presence.offline-claim", () =>
        this.redis.command.eval<number>(
          CLAIM_OFFLINE,
          keys.length,
          ...keys,
          ...args,
        ),
      );

      if (claimed === -1) return -1;
      completed += claimed;
    }

    const outbox = yield* this.readReady("outbox", token);

    // Capturing outbox values may outlast the lease; check once after that
    // external read. Every successful acknowledgement renews it thereafter.
    if (outbox.length > 0) {
      const renewed = yield* storeCall("presence.offline-renew", () =>
        this.redis.command.eval<number>(
          RENEW_OFFLINE_LEASE,
          1,
          OFFLINE_SWEEP_LOCK,
          token,
          OFFLINE_LEASE_MS,
        ),
      );

      if (!renewed) return -1;
    }

    for (const { key, value, event } of outbox) {
      yield* publish(event).pipe(Effect.timeout("10 seconds"));

      const acknowledged = yield* storeCall(
        "presence.offline-outbox-complete",
        () =>
          this.redis.command.eval<number>(
            ACK_OFFLINE,
            3,
            OFFLINE_SWEEP_LOCK,
            key,
            OFFLINE_OUTBOX_INDEX,
            token,
            value,
            key,
            OFFLINE_LEASE_MS,
          ),
      );

      if (acknowledged === -1) return -1;
      completed += acknowledged;
    }

    return completed;
  });
}
