import { randomUUID } from "node:crypto";
import { ContextLogger } from "@lootlog/instrumentation";
import type { RedisStore } from "#src/infrastructure/redis-store";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type {
  AbyssSeasonsQuery,
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "#src/battles/analytics/query-battle-statistics";
import { Effect } from "effect";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { stableJsonCacheKey } from "@lootlog/schema/stable-json";

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

export const makeBattleAnalyticsCache = (
  redisService: Pick<RedisStore, "evalScript" | "getOrSetJson" | "set">,
) => {
  const logger = new ContextLogger("BattleAnalyticsCache");

  const formatCacheSegment = (
    value: string | number | undefined,
    fallback = "all",
  ): string => String(value ?? fallback);

  const formatLevelCacheSegment = (query: {
    minLevel?: number | undefined;
    maxLevel?: number | undefined;
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
      const generation = yield* redisService
        .evalScript<string>(
          CACHE_GENERATION_SCRIPT,
          [`battle-cache-generation:${userId}`],
          [randomUUID()],
        )
        .pipe(
          Effect.catch((error) => {
            logger.warn("Battle analytics cache unavailable", error);

            return Effect.undefined;
          }),
        );

      if (generation === undefined) return yield* factory();
      const versionedKey = `battle-cache:v4:${encodeURIComponent(userId)}:${generation}:${cacheKey}`;

      return yield* redisService.getOrSetJson<T, unknown, never>({
        key: versionedKey,
        ttlSeconds: ANALYTICS_CACHE_TTL_SECONDS,
        codec: { stringify: JSON.stringify, parse: decodeJson },
        factory: Effect.suspend(factory),
        onError: (error) =>
          Effect.sync(() =>
            logger.warn("Battle analytics cache unavailable", error),
          ),
      });
    });

  const invalidateUserAnalytics = (userId: string) =>
    redisService.set(`battle-cache-generation:${userId}`, randomUUID()).pipe(
      Effect.catch((error) => {
        logger.warn(
          `Failed to invalidate analytics cache for user ${userId}:`,
          error,
        );

        return Effect.void;
      }),
      withAdapterSpan("BattleAnalyticsCache_invalidateUser", "redis"),
    );

  const formatAnalyticsFilterSegments = (
    query: BattleAnalyticsCriteria | BattleStatisticsQuery,
  ): string[] => [
    formatCacheSegment(query.characterId),
    formatCacheSegment(query.world),
    formatCacheSegment(query.period),
    formatCacheSegment(query.startDate),
    formatCacheSegment(query.endDate),
    formatLevelCacheSegment(query),
    formatBooleanCacheSegment(query.ph, "ph"),
    formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
  ];

  const buildAnalyticsCacheKey = (
    userId: string,
    query: BattleAnalyticsCriteria,
  ): string =>
    [
      ANALYTICS_CACHE_PREFIX,
      userId,
      ...formatAnalyticsFilterSegments(query),
    ].join(":");

  const buildStatisticsCacheKey = (
    metric: string,
    userId: string,
    query: BattleStatisticsQuery,
  ): string =>
    [
      "statistics",
      metric,
      userId,
      ...formatAnalyticsFilterSegments(query),
    ].join(":");

  const buildQueryCacheKey = (
    prefix: string,
    metric: string,
    userId: string,
    query:
      | BattleStatisticsQuery
      | AbyssSeasonsQuery
      | PlayerVsPlayerQuery
      | { characterId?: string | undefined; world?: string | undefined },
  ): string => [prefix, metric, userId, stableJsonCacheKey(query)].join(":");

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
