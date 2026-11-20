import { isObjectRecord } from "@lootlog/schema/records";
import { Clock, Effect } from "effect";
import type { RedisError } from "effect/persistence/Redis";
import type { RedisService } from "#src/redis/redis.service";
import type { DiscordEndpoint } from "./discord.types.js";
import { decodeJsonUnknown } from "#src/shared/schema/json";

interface UserRateLimitData {
  bucket?: string | null;
  limit?: number | null;
  remaining?: number | null;
  retryAfter: number;
  resetAt: number;
}

interface DiscordRateLimitState {
  bucket: string | null;
  limit: number | null;
  remaining: number | null;
  resetAt: number;
  retryAfter: number;
  isBlocked: boolean;
}

/** Discord's per-user rate limit state, shared across API processes. */
export interface DiscordRateLimiter {
  readonly checkRateLimitForUser: (
    userId: string,
    endpoint: DiscordEndpoint,
  ) => Effect.Effect<boolean, RedisError>;
  readonly getNextAvailableAtForUser: (
    userId: string,
    endpoint: DiscordEndpoint,
  ) => Effect.Effect<Date | null, RedisError>;
  readonly updateRateLimitFromHeaders: (
    userId: string,
    endpoint: DiscordEndpoint,
    headers: { get(name: string): string | null },
  ) => Effect.Effect<void, RedisError>;
  readonly setRateLimitForUser: (
    userId: string,
    endpoint: DiscordEndpoint,
    retryAfterMs: number,
  ) => Effect.Effect<void, RedisError>;
}

const RATE_LIMIT_KEY_PREFIX = "discord:ratelimit:user:";

const getUserKey = (userId: string, endpoint: DiscordEndpoint): string =>
  `${RATE_LIMIT_KEY_PREFIX}${userId}:${endpoint}`;

export const makeDiscordRateLimiter = (
  redis: Pick<RedisService, "get" | "set" | "del">,
): DiscordRateLimiter => {
  const getStoredRateLimitData = (
    key: string,
    userId: string,
    endpoint: DiscordEndpoint,
  ) =>
    Effect.gen(function* () {
      const data = yield* redis.get(key);

      if (!data) {
        return null;
      }

      const parsed = yield* Effect.try({
        try: () => decodeJsonUnknown(data),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.logDebug({
            message: "Failed to parse Discord rate limit cache",
            userId,
            endpoint,
            error,
          }),
        ),
      );

      if (isUserRateLimitData(parsed)) {
        return parsed;
      }

      yield* redis.del(key);

      return null;
    });

  const getRateLimitStateForUser = (
    userId: string,
    endpoint: DiscordEndpoint,
  ): Effect.Effect<DiscordRateLimitState | null, RedisError> =>
    Effect.gen(function* () {
      const key = getUserKey(userId, endpoint);

      const rateLimitData = yield* getStoredRateLimitData(
        key,
        userId,
        endpoint,
      );

      if (!rateLimitData) {
        return null;
      }

      const now = yield* Clock.currentTimeMillis;

      if (rateLimitData.resetAt <= now) {
        yield* redis.del(key);

        return null;
      }

      const remaining = rateLimitData.remaining ?? null;

      return {
        bucket: rateLimitData.bucket ?? null,
        limit: rateLimitData.limit ?? null,
        remaining,
        resetAt: rateLimitData.resetAt,
        retryAfter: rateLimitData.retryAfter,
        isBlocked:
          remaining !== null ? remaining <= 0 : rateLimitData.retryAfter > 0,
      };
    });

  return {
    checkRateLimitForUser: (userId, endpoint) =>
      Effect.gen(function* () {
        const state = yield* getRateLimitStateForUser(userId, endpoint);

        if (!state?.isBlocked) {
          return false;
        }

        const waitTime = state.resetAt - (yield* Clock.currentTimeMillis);

        yield* Effect.logWarning({
          message: `Rate limit active for user ${userId} on endpoint ${endpoint}. Wait time: ${waitTime}ms`,
          userId,
          endpoint,
          resetAt: new Date(state.resetAt).toISOString(),
        });

        return true;
      }),
    getNextAvailableAtForUser: (userId, endpoint) =>
      getRateLimitStateForUser(userId, endpoint).pipe(
        Effect.map((state) =>
          state?.isBlocked ? new Date(state.resetAt) : null,
        ),
      ),
    updateRateLimitFromHeaders: (userId, endpoint, headers) =>
      Effect.gen(function* () {
        const bucket = headers.get("x-ratelimit-bucket");
        const limitHeader = headers.get("x-ratelimit-limit");
        const remainingHeader = headers.get("x-ratelimit-remaining");

        const resetAfterHeader =
          headers.get("x-ratelimit-reset-after") ?? headers.get("retry-after");

        const resetHeader = headers.get("x-ratelimit-reset");

        const limit = limitHeader ? Number.parseInt(limitHeader, 10) : null;

        const remaining = remainingHeader
          ? Number.parseInt(remainingHeader, 10)
          : null;

        const resetAfterSeconds = resetAfterHeader
          ? Number.parseFloat(resetAfterHeader)
          : Number.NaN;

        const resetAtSeconds = resetHeader
          ? Number.parseFloat(resetHeader)
          : Number.NaN;

        const now = yield* Clock.currentTimeMillis;
        let resetAt = 0;

        if (Number.isFinite(resetAfterSeconds)) {
          resetAt = now + Math.ceil(resetAfterSeconds * 1000);
        } else if (Number.isFinite(resetAtSeconds)) {
          resetAt = Math.ceil(resetAtSeconds * 1000);
        }

        if (
          bucket === null &&
          limit === null &&
          remaining === null &&
          resetAt === 0
        ) {
          return;
        }

        const ttlSeconds =
          resetAt > 0 ? Math.max(Math.ceil((resetAt - now) / 1000), 1) : 60;

        const nextState: UserRateLimitData = {
          bucket,
          limit,
          remaining,
          retryAfter: resetAt > 0 ? Math.max(resetAt - now, 0) : 0,
          resetAt: resetAt > 0 ? resetAt : now + ttlSeconds * 1000,
        };

        yield* redis.set(
          getUserKey(userId, endpoint),
          JSON.stringify(nextState),
          ttlSeconds,
        );

        yield* Effect.logDebug({
          message: "Updated Discord rate limit state from headers",
          userId,
          endpoint,
          bucket,
          limit,
          remaining,
          resetAt: new Date(nextState.resetAt).toISOString(),
          ttlSeconds,
        });
      }),
    setRateLimitForUser: (userId, endpoint, retryAfterMs) =>
      Effect.gen(function* () {
        const resetAt = (yield* Clock.currentTimeMillis) + retryAfterMs;
        const ttlSeconds = Math.max(Math.ceil(retryAfterMs / 1000), 1);

        const rateLimitData: UserRateLimitData = {
          bucket: null,
          limit: null,
          remaining: 0,
          retryAfter: retryAfterMs,
          resetAt,
        };

        yield* redis.set(
          getUserKey(userId, endpoint),
          JSON.stringify(rateLimitData),
          ttlSeconds,
        );

        yield* Effect.logWarning({
          message: "Set rate limit for user",
          userId,
          endpoint,
          retryAfterMs,
          resetAt: new Date(resetAt).toISOString(),
          ttlSeconds,
        });
      }),
  };
};

function isUserRateLimitData(value: unknown): value is UserRateLimitData {
  if (!isObjectRecord(value)) {
    return false;
  }

  const data = value;

  const isOptional = (field: unknown, type: "number" | "string"): boolean =>
    field === undefined || field === null || typeof field === type;

  return (
    typeof data.retryAfter === "number" &&
    typeof data.resetAt === "number" &&
    isOptional(data.bucket, "string") &&
    isOptional(data.limit, "number") &&
    isOptional(data.remaining, "number")
  );
}
