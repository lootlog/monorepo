import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { Effect, Option, Schedule, Schema } from "effect";
import { yieldToEventLoop } from "#src/platform/background-tasks";
import type { PresenceOfflineOutbox } from "#src/realtime/presence-offline";
import {
  type PresenceChange,
  type PresenceRedis,
  decodeMetadataOption,
  decodePresenceOption,
  decodeStoredKeys,
  indexKey,
  metadataKey,
  presenceKey,
  releaseLease,
  storeCall,
} from "#src/realtime/presence-records";

export const EXPIRY_DUE_INDEX = "presence:expiry:due";

const EXPIRY_SWEEP_LOCK = "presence:expiry:sweep-lock";

const EXPIRY_BATCH_SIZE = 100;

const EXPIRY_LEASE_MS = 30_000;

const SWEEP_INTERVAL_MS = 5_000;

const READ_EXPIRY_READY = `
-- presence:expiry-ready
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return '[]' end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
local members = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[3], 'LIMIT', 0, ARGV[4])
if #members == 0 then return '[]' end
return cjson.encode(members)
`;

// KEYS 6 onwards schedule the departure in the same operation: the new
// departure, its character index, the offline due index, and the departures
// it supersedes. Their captured values and the index size must still match.
const REMOVE_EXPIRED_PRESENCE = `
-- presence:expiry-remove
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[7])
local due = redis.call('ZSCORE', KEYS[5], ARGV[4])
if not due or tonumber(due) > tonumber(ARGV[5]) then return 0 end
if (redis.call('GET', KEYS[2]) or '') ~= ARGV[2]
    or (redis.call('GET', KEYS[3]) or '') ~= ARGV[3] then return 0 end
if #KEYS > 5 then
  local count = #KEYS - 8
  if redis.call('SCARD', KEYS[7]) ~= count then return 0 end
  for key = 9, #KEYS do
    if (redis.call('GET', KEYS[key]) or '') ~= ARGV[key + 2]
        or redis.call('SISMEMBER', KEYS[7], ARGV[key + 2 + count]) == 0 then return 0 end
  end
  for key = 9, #KEYS do
    local member = ARGV[key + 2 + count]
    redis.call('DEL', KEYS[key])
    redis.call('SREM', KEYS[7], member)
    redis.call('ZREM', KEYS[8], member)
  end
  redis.call('SET', KEYS[6], ARGV[8])
  redis.call('SADD', KEYS[7], ARGV[9])
  redis.call('ZADD', KEYS[8], ARGV[10], ARGV[9])
end
redis.call('DEL', KEYS[2], KEYS[3])
redis.call('SREM', KEYS[4], ARGV[6])
redis.call('ZREM', KEYS[5], ARGV[4])
return 1
`;

const decodeExpiryMember = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Tuple([Schema.String, Schema.String])),
);

type ExpiryCandidate = {
  readonly organizationId: string;
  readonly sessionId: string;
  readonly value: string | null;
  readonly metadataValue: string | null;
};

/**
 * Removes sessions that stopped refreshing. The due index scores each
 * `[organizationId, sessionId]` at `lastSeen + PRESENCE_EXPIRY_MS`, so an idle
 * sweep reads no payloads.
 */
export class PresenceExpiry {
  constructor(
    private readonly redis: PresenceRedis,
    private readonly now: () => number,
    private readonly offline: Pick<
      PresenceOfflineOutbox,
      "prepareExpiryDeparture"
    >,
    private readonly onRemoved: (
      organizationId: string,
      change: PresenceChange,
    ) => void,
  ) {}

  run(): Effect.Effect<void> {
    return this.sweep().pipe(
      Effect.catch((error) =>
        Effect.logError("Presence expiry sweep failed; retrying", error),
      ),
      Effect.repeat(Schedule.spaced(SWEEP_INTERVAL_MS)),
      Effect.asVoid,
    );
  }

  sweep(): Effect.Effect<void, unknown> {
    return Effect.suspend(() => {
      const token = crypto.randomUUID();

      return storeCall("presence.acquire-sweep-lock", () =>
        this.redis.command.set(
          EXPIRY_SWEEP_LOCK,
          token,
          "PX",
          EXPIRY_LEASE_MS,
          "NX",
        ),
      ).pipe(
        Effect.flatMap((acquired) =>
          acquired === "OK"
            ? this.drain(token).pipe(
                Effect.ensuring(
                  releaseLease(
                    this.redis,
                    "presence.release-sweep-lock",
                    EXPIRY_SWEEP_LOCK,
                    token,
                  ),
                ),
              )
            : Effect.void,
        ),
      );
    });
  }

  // A drain yields between batches and starts no batch after one second.
  private drain = Effect.fnUntraced(function* (
    this: PresenceExpiry,
    token: string,
  ) {
    const deadline = performance.now() + 1_000;

    do {
      const raw = yield* storeCall("presence.expiry-ready", () =>
        this.redis.command.eval<string>(
          READ_EXPIRY_READY,
          2,
          EXPIRY_SWEEP_LOCK,
          EXPIRY_DUE_INDEX,
          token,
          EXPIRY_LEASE_MS,
          this.now(),
          EXPIRY_BATCH_SIZE,
        ),
      );

      const members = yield* decodeStoredKeys(raw);

      if (members.length === 0) return;

      const coordinates = yield* Effect.forEach(members, (member) =>
        decodeExpiryMember(member),
      );

      let completed = 0;

      for (const candidate of yield* this.readCandidates(coordinates))
        completed += yield* this.expire(token, candidate);

      if (completed === 0 || members.length < EXPIRY_BATCH_SIZE) return;
      yield* yieldToEventLoop;
    } while (performance.now() < deadline);
  });

  private readCandidates(
    coordinates: ReadonlyArray<readonly [string, string]>,
  ): Effect.Effect<ExpiryCandidate[], unknown> {
    return storeCall("presence.read-expiry-candidates", () =>
      this.redis.command.mget(
        coordinates.flatMap(([organizationId, sessionId]) => [
          presenceKey(organizationId, sessionId),
          metadataKey(organizationId, sessionId),
        ]),
      ),
    ).pipe(
      Effect.map((values) =>
        coordinates.map(([organizationId, sessionId], index) => ({
          organizationId,
          sessionId,
          value: values[index * 2] ?? null,
          metadataValue: values[index * 2 + 1] ?? null,
        })),
      ),
    );
  }

  private expire = Effect.fnUntraced(function* (
    this: PresenceExpiry,
    token: string,
    candidate: ExpiryCandidate,
  ) {
    const presence = Option.getOrUndefined(
      decodePresenceOption(candidate.value),
    );

    const metadata = Option.getOrUndefined(
      decodeMetadataOption(candidate.metadataValue),
    );

    const latest = presence ?? metadata?.presence;

    // The refresh that made it fresh also moved its due score.
    if (latest && this.now() - latest.lastSeen < PRESENCE_EXPIRY_MS) return 1;

    const departure = yield* this.offline.prepareExpiryDeparture(
      metadata?.presence,
    );

    const { organizationId, sessionId } = candidate;
    const member = JSON.stringify([organizationId, sessionId]);

    const keys = [
      EXPIRY_SWEEP_LOCK,
      presenceKey(organizationId, sessionId),
      metadataKey(organizationId, sessionId),
      indexKey(organizationId),
      EXPIRY_DUE_INDEX,
      ...departure.keys,
    ];

    const removed = yield* storeCall("presence.expiry-remove", () =>
      this.redis.command
        .eval<number>(
          REMOVE_EXPIRED_PRESENCE,
          keys.length,
          ...keys,
          token,
          candidate.value ?? "",
          candidate.metadataValue ?? "",
          member,
          this.now(),
          presenceKey(organizationId, sessionId),
          EXPIRY_LEASE_MS,
          ...departure.args,
        )
        // Announce a removal once it is stored, even if the sweep was interrupted.
        .then((removed) => {
          if (removed && metadata)
            this.onRemoved(organizationId, {
              action: "remove",
              userId: metadata.userId,
              discordId: metadata.discordId,
              sessionId,
            });

          return removed;
        }),
    );

    return removed ? 1 : 0;
  });
}
