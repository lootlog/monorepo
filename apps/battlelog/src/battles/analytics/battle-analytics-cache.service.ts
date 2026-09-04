import { randomUUID } from "node:crypto";
import { Logger } from "#src/infrastructure/logger";
import type { RedisStore } from "#src/infrastructure/redis-store";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type { BattleStatisticsQuery } from "#src/battles/analytics/query-battle-statistics";
import { type Cause, Effect, Exit } from "effect";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

const ANALYTICS_CACHE_PREFIX = "analytics";
const ANALYTICS_CACHE_TTL_SECONDS = 5 * 60;
const CACHE_GENERATION_SCRIPT = `
local generation = redis.call("GET", KEYS[1])
if not generation then
  generation = ARGV[1]
  redis.call("SET", KEYS[1], generation)
end
return generation
`;

export const makeBattleAnalyticsCache = (redisService: RedisStore) => {
  const logger = new Logger("BattleAnalyticsCache");

  const formatCacheSegment = (
    value: string | number | undefined,
    fallback = "all",
  ): string => String(value ?? fallback);

  const formatLevelCacheSegment = (query: {
    minLevel?: number;
    maxLevel?: number;
  }): string =>
    `${formatCacheSegment(query.minLevel, "any")}-${formatCacheSegment(query.maxLevel, "any")}`;

  const formatBooleanCacheSegment = (
    enabled: boolean | undefined,
    enabledSegment: string,
  ): string => {
    if (enabled === undefined) {
      return "all";
    }

    return enabled ? enabledSegment : `not-${enabledSegment}`;
  };

  const getOrSetJson = <T>(
    userId: string,
    cacheKey: string,
    factory: () => Effect.Effect<T, unknown>,
    decodeJson: (value: string) => T,
  ) =>
    Effect.gen(function* () {
      const generation = yield* Effect.tryPromise({
        try: () =>
          redisService.eval<string>(
            CACHE_GENERATION_SCRIPT,
            [`battle-cache-generation:${userId}`],
            [randomUUID()],
          ),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) => {
          logger.warn("Battle analytics cache unavailable", error);
          return Effect.succeed(undefined);
        }),
      );
      if (generation === undefined) return yield* factory();
      const versionedKey = `battle-cache:v2:${encodeURIComponent(userId)}:${generation}:${cacheKey}`;
      const context = yield* Effect.context();
      let failure: Cause.Cause<unknown> | undefined;
      return yield* Effect.tryPromise({
        try: (signal) =>
          redisService.getOrSetJsonBestEffort<T>({
            key: versionedKey,
            ttlSeconds: ANALYTICS_CACHE_TTL_SECONDS,
            codec: { stringify: JSON.stringify, parse: decodeJson },
            factory: async () => {
              const exit = await Effect.runPromiseExitWith(context)(
                Effect.suspend(factory),
                { signal },
              );
              if (Exit.isFailure(exit)) {
                failure = exit.cause;
                throw exit.cause;
              }
              return exit.value;
            },
            onError: (error) =>
              logger.warn("Battle analytics cache unavailable", error),
          }),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          failure === undefined ? Effect.die(error) : Effect.failCause(failure),
        ),
      );
    });

  const invalidateUserAnalytics = (userId: string) =>
    Effect.tryPromise({
      try: () =>
        redisService.set(`battle-cache-generation:${userId}`, randomUUID()),
      catch: (cause) => cause,
    }).pipe(
      Effect.catch((error) => {
        logger.warn(
          `Failed to invalidate analytics cache for user ${userId}:`,
          error,
        );
        return Effect.void;
      }),
      Effect.withSpan("BattleAnalyticsCache_invalidateUser", {
        attributes: { adapter: "redis", retryCount: 0 },
      }),
    );

  const buildAnalyticsCacheKey = (
    userId: string,
    query: BattleAnalyticsCriteria,
  ): string =>
    [
      ANALYTICS_CACHE_PREFIX,
      userId,
      formatCacheSegment(query.characterId),
      formatCacheSegment(query.world),
      formatCacheSegment(query.period),
      formatCacheSegment(query.startDate),
      formatCacheSegment(query.endDate),
      formatLevelCacheSegment(query),
      formatBooleanCacheSegment(query.ph, "ph"),
      formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
    ].join(":");

  const buildStatisticsCacheKey = (
    metric: string,
    userId: string,
    query: BattleStatisticsQuery,
    options: { includeBattleFilters?: boolean } = {},
  ): string => {
    const cacheKeySegments = [
      "statistics",
      metric,
      userId,
      formatCacheSegment(query.characterId),
      formatCacheSegment(query.world),
      formatCacheSegment(query.period),
      formatCacheSegment(query.startDate),
      formatCacheSegment(query.endDate),
      formatLevelCacheSegment(query),
    ];

    if (options.includeBattleFilters ?? true) {
      cacheKeySegments.push(
        formatBooleanCacheSegment(query.ph, "ph"),
        formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
      );
    }

    return cacheKeySegments.join(":");
  };

  const buildQueryCacheKey = (
    prefix: string,
    metric: string,
    userId: string,
    query: object,
  ): string =>
    [
      prefix,
      metric,
      userId,
      Buffer.from(stableJsonStringify(query)).toString("base64url"),
    ].join(":");

  return {
    buildAnalyticsCacheKey,
    buildQueryCacheKey,
    buildStatisticsCacheKey,
    getOrSetJson,
    invalidateUserAnalytics,
    ttlSeconds: ANALYTICS_CACHE_TTL_SECONDS,
  };
};

export type BattleAnalyticsCache = ReturnType<typeof makeBattleAnalyticsCache>;
