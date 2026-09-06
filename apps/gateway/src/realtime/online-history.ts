import { Effect, Schedule, Schema } from "effect";
import {
  UserOnlineCheckpointV1,
  type UserOnlineEventV1,
} from "@lootlog/protocol/rabbit/events";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import type { RedisGatewayCommands } from "#src/platform/redis-store";
import type { SessionData } from "./session.js";

const PENDING = "online-history:pending";
const DUE = "online-history:due";
const AGE = "online-history:age";
const INTERVAL_MS = 60_000;

// Persist every confirmed observation before publishing cumulative segments. A
// process restart therefore loses no observation already accepted by Redis.
const OBSERVE = `
local now = tonumber(ARGV[1])
local final = ARGV[2] == '1'
local previous = redis.call('GET', KEYS[1])
local state = previous and cjson.decode(previous) or nil
if final and not state then return 0 end
if state and now < state.lastSeen then return 0 end
if state and now - state.lastSeen > tonumber(ARGV[3]) then
  if final then redis.call('DEL', KEYS[1]); return 0 end
  state = nil
end
if state and now - state.started >= 86400000 then
  state = {started = state.lastSeen, lastSeen = state.lastSeen}
end
if not state then state = {started = now, lastSeen = now} end
state.lastSeen = now
local id = ARGV[5] .. ':' .. tostring(state.started)
-- Dates are encoded in JavaScript from the numeric times returned below.
local value = cjson.encode({userId=ARGV[4],sessionId=ARGV[5],segmentId=id,started=state.started,ended=now,final=final})
if now > state.started then
  local sent = tonumber(redis.call('GET', KEYS[5]) or '0')
  local due = final and now or math.max(state.started + 60000, sent + 60000)
  if redis.call('HEXISTS', KEYS[2], id) == 0 then
    redis.call('ZADD', KEYS[4], now, id)
    redis.call('ZADD', KEYS[3], due, id)
  elseif final then redis.call('ZADD', KEYS[3], now, id) end
  redis.call('HSET', KEYS[2], id, value)
end
if final then redis.call('DEL', KEYS[1])
else redis.call('SET', KEYS[1], cjson.encode(state), 'PX', ARGV[3] * 2) end
return 1
`;

const CLAIM = `
local ids = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 100)
local values = {}
for _, id in ipairs(ids) do
  local value = redis.call('HGET', KEYS[2], id)
  if value then
    table.insert(values, value)
    redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + 60000, id)
  else
    redis.call('ZREM', KEYS[1], id)
    redis.call('ZREM', KEYS[3], id)
  end
end
return values
`;

const ACK = `
redis.call('SET', KEYS[4], ARGV[3], 'PX', 120000)
if redis.call('HGET', KEYS[1], ARGV[1]) == ARGV[2] then
  redis.call('HDEL', KEYS[1], ARGV[1])
  redis.call('ZREM', KEYS[2], ARGV[1])
  redis.call('ZREM', KEYS[3], ARGV[1])
end
return 1
`;

const Pending = Schema.fromJsonString(
  Schema.Struct({
    userId: Schema.String,
    sessionId: Schema.String,
    segmentId: Schema.String,
    started: Schema.Number,
    ended: Schema.Number,
    final: Schema.Boolean,
  }),
);
const decodePending = Schema.decodeUnknownSync(Pending);

export class OnlineHistory {
  private lastHealthAt = 0;
  private degradedUntil = 0;

  constructor(
    private readonly redis: Pick<RedisGatewayCommands, "eval">,
    private readonly publish: (
      event: UserOnlineEventV1,
    ) => Effect.Effect<void, unknown>,
    private readonly now: () => number = Date.now,
  ) {}

  observe(session: SessionData, observedAt: number, final = false) {
    if (session.platform !== "game" || !session.joined || !session.character) {
      return Effect.void;
    }
    return Effect.tryPromise(() =>
      this.redis.eval(
        OBSERVE,
        5,
        `online-history:session:${session.connectionId}`,
        PENDING,
        DUE,
        AGE,
        `online-history:sent:${session.connectionId}`,
        observedAt,
        final ? "1" : "0",
        PRESENCE_EXPIRY_MS,
        session.userId,
        session.connectionId,
      ),
    ).pipe(
      Effect.asVoid,
      Effect.catch((cause) =>
        Effect.sync(() => {
          this.degradedUntil = this.now() + 180_000;
        }).pipe(
          Effect.andThen(
            Effect.logError("Online history observation failed", cause),
          ),
        ),
      ),
    );
  }

  flush() {
    return Effect.gen({ self: this }, function* () {
      const now = this.now();
      const values = yield* Effect.tryPromise(() =>
        this.redis.eval<string[]>(CLAIM, 3, DUE, PENDING, AGE, now),
      );
      for (const raw of values) {
        const item = yield* Effect.try(() => decodePending(raw));
        const event = Schema.decodeUnknownSync(UserOnlineCheckpointV1)({
          version: 1,
          type: "checkpoint",
          userId: item.userId,
          sessionId: item.sessionId,
          segmentId: item.segmentId,
          startedAt: new Date(item.started).toISOString(),
          endedAt: new Date(item.ended).toISOString(),
          observedAt: new Date(item.ended).toISOString(),
        });
        yield* this.publish(event);
        yield* Effect.tryPromise(() =>
          this.redis.eval(
            ACK,
            4,
            PENDING,
            DUE,
            AGE,
            `online-history:sent:${item.sessionId}`,
            item.segmentId,
            raw,
            now,
          ),
        );
      }
      if (now - this.lastHealthAt >= INTERVAL_MS) {
        const oldest = yield* Effect.tryPromise(() =>
          this.redis.eval<string[]>(
            "return redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')",
            1,
            AGE,
          ),
        );
        yield* this.publish({
          version: 1,
          type: "collector",
          observedAt: new Date(now).toISOString(),
          status:
            now < this.degradedUntil ||
            (oldest.length > 0 && now - Number(oldest[1]) > 180_000)
              ? "degraded"
              : "healthy",
        });
        this.lastHealthAt = now;
      }
    }).pipe(
      Effect.catch((cause) =>
        Effect.gen({ self: this }, function* () {
          const now = this.now();
          this.degradedUntil = now + 180_000;
          // Report a Redis outage through Rabbit too: another gateway may still
          // be healthy and must not hide this collector's missing observations.
          if (now - this.lastHealthAt >= INTERVAL_MS) {
            yield* this.publish({
              version: 1,
              type: "collector",
              observedAt: new Date(now).toISOString(),
              status: "degraded",
            }).pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  this.lastHealthAt = now;
                }),
              ),
              Effect.catch((error) =>
                Effect.logError(
                  "Online collector health delivery failed",
                  error,
                ),
              ),
            );
          }
          return yield* Effect.fail(cause);
        }),
      ),
    );
  }

  run() {
    return this.flush().pipe(
      Effect.catch((cause) =>
        Effect.logError("Online history delivery failed; retrying", cause),
      ),
      Effect.repeat(Schedule.spaced("5 seconds")),
    );
  }
}
