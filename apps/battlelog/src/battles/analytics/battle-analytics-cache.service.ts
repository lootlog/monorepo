import { Logger } from "#src/infrastructure/logger";
import type { RedisStore } from "#src/infrastructure/redis-store";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type { BattleStatisticsQuery } from "#src/battles/analytics/query-battle-statistics";
import { Effect } from "effect";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

const ANALYTICS_CACHE_PREFIX = "analytics";
const ANALYTICS_CACHE_TTL_SECONDS = 5 * 60;

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

  const getJson = <T>(cacheKey: string, decodeJson: (value: string) => T) =>
    Effect.tryPromise({
      try: () => Promise.resolve(redisService.get(cacheKey)),
      catch: (cause) => cause,
    }).pipe(
      Effect.map((cachedResult) =>
        cachedResult ? decodeJson(cachedResult) : null,
      ),
      Effect.withSpan("BattleAnalyticsCache_getJson", {
        attributes: { adapter: "redis", retryCount: 0 },
      }),
    );

  const setJson = <T>(cacheKey: string, result: T) =>
    Effect.tryPromise({
      try: () =>
        Promise.resolve(
          redisService.set(
            cacheKey,
            JSON.stringify(result),
            ANALYTICS_CACHE_TTL_SECONDS,
          ),
        ),
      catch: (cause) => cause,
    }).pipe(
      Effect.withSpan("BattleAnalyticsCache_setJson", {
        attributes: { adapter: "redis", retryCount: 0 },
      }),
    );

  const getOrSetJson = <T>(
    cacheKey: string,
    factory: () => Effect.Effect<T, unknown>,
    decodeJson: (value: string) => T,
  ) =>
    Effect.gen(function* () {
      const cached = yield* getJson(cacheKey, decodeJson).pipe(
        Effect.catch((error) => {
          logger.warn("Battle analytics cache unavailable", error);
          return Effect.succeed(null);
        }),
      );
      if (cached !== null) return cached;
      const result = yield* factory();
      yield* setJson(cacheKey, result).pipe(
        Effect.catch((error) => {
          logger.warn("Battle analytics cache unavailable", error);
          return Effect.void;
        }),
      );
      return result;
    });

  const invalidateUserAnalytics = (userId: string) =>
    Effect.gen(function* () {
      const patterns = [
        `${ANALYTICS_CACHE_PREFIX}:${userId}:*`,
        `statistics:*:${userId}:*`,
        `battle-characters:*:${userId}*`,
        `battle-worlds:${userId}:*`,
      ];

      for (const pattern of patterns) {
        yield* Effect.tryPromise({
          try: () => Promise.resolve(redisService.deleteByPattern(pattern)),
          catch: (cause) => cause,
        });
      }
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
    getJson,
    getOrSetJson,
    invalidateUserAnalytics,
    setJson,
    ttlSeconds: ANALYTICS_CACHE_TTL_SECONDS,
  };
};

export type BattleAnalyticsCache = ReturnType<typeof makeBattleAnalyticsCache>;
