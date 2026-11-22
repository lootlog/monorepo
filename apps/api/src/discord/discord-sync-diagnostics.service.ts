import { Clock, Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import type {
  DiscordEndpoint,
  DiscordInvalidRequestStatus,
} from "./discord.types.js";

type DiscordMemberRefreshMetricOutcome =
  | "queued"
  | "delayed"
  | "refused"
  | "rate_limited"
  | "processed"
  | "failed"
  | "stale_used"
  | "verification_unavailable";

export interface DiscordSyncDiagnostics {
  readonly recordInvalidDiscordRequest: (options: {
    readonly endpoint: DiscordEndpoint;
    readonly status: DiscordInvalidRequestStatus;
    readonly source?: string;
  }) => Effect.Effect<void>;
  readonly recordMemberRefreshMetric: (options: {
    readonly outcome: DiscordMemberRefreshMetricOutcome;
    readonly reason?: string;
  }) => Effect.Effect<void>;
  readonly recordMemberRefreshLatency: (
    latencyMs: number,
  ) => Effect.Effect<void>;
}

const WINDOW_MS = 10 * 60 * 1000;

const WINDOW_TTL_SECONDS = 20 * 60;

const RECORD_LATENCY_SCRIPT = `
redis.call("HINCRBY", KEYS[1], "count", 1)
redis.call("HINCRBY", KEYS[1], "sumMs", ARGV[1])
redis.call("EXPIRE", KEYS[1], ARGV[2])
return 1
`;

const windowStartedAt = Effect.map(
  Clock.currentTimeMillis,
  (now) => new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS),
);

export const makeDiscordSyncDiagnostics = (
  redis: Pick<RedisService, "incr" | "expire" | "eval">,
): DiscordSyncDiagnostics => {
  const incrementCounter = (key: string) =>
    Effect.gen(function* () {
      const count = yield* redis.incr(key);

      if (count === 1) {
        yield* redis.expire(key, WINDOW_TTL_SECONDS);
      }

      return count;
    });

  const runSafely = <E>(event: string, action: Effect.Effect<void, E>) =>
    action.pipe(
      Effect.catch((error) =>
        Effect.logDebug({
          event,
          message: "Failed to record Discord diagnostics",
          error,
        }),
      ),
    );

  return {
    recordInvalidDiscordRequest: (options) =>
      runSafely(
        "discord.invalid_request",
        Effect.gen(function* () {
          const startedAt = yield* windowStartedAt;
          const key = `discord:invalid-requests:10m:${startedAt.getTime()}:${options.endpoint}:${options.status}`;
          const count = yield* incrementCounter(key);

          yield* Effect.logWarning({
            event: "discord.invalid_request",
            message: "Discord invalid request recorded",
            endpoint: options.endpoint,
            status: options.status,
            source: options.source,
            count,
            windowStartedAt: startedAt.toISOString(),
          });
        }),
      ),
    recordMemberRefreshMetric: (options) =>
      runSafely(
        "discord.member_refresh.metric",
        Effect.gen(function* () {
          const startedAt = yield* windowStartedAt;
          const key = `discord:member-refresh:10m:${startedAt.getTime()}:${options.outcome}`;
          const count = yield* incrementCounter(key);

          yield* Effect.logDebug({
            event: "discord.member_refresh.metric",
            message: "Discord member refresh metric recorded",
            outcome: options.outcome,
            reason: options.reason,
            count,
            windowStartedAt: startedAt.toISOString(),
          });
        }),
      ),
    recordMemberRefreshLatency: (latencyMs) => {
      const boundedLatencyMs = Math.max(Math.round(latencyMs), 0);

      return runSafely(
        "discord.member_refresh.latency",
        Effect.gen(function* () {
          const startedAt = yield* windowStartedAt;
          const key = `discord:member-refresh:latency:10m:${startedAt.getTime()}`;

          yield* redis.eval(
            RECORD_LATENCY_SCRIPT,
            [key],
            [boundedLatencyMs, WINDOW_TTL_SECONDS],
          );

          yield* Effect.logDebug({
            event: "discord.member_refresh.latency",
            message: "Discord member refresh latency recorded",
            latencyMs: boundedLatencyMs,
            windowStartedAt: startedAt.toISOString(),
          });
        }),
      );
    },
  };
};
