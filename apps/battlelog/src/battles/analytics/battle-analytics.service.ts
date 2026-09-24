import { Clock, Effect, Schema } from "effect";
import type { BattleAnalyticsCriteria } from "#src/battles/analytics/query-battle-analytics";
import type {
  AbyssSeasonsQuery,
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "#src/battles/analytics/query-battle-statistics";
import {
  BattleStatisticsResponseSchemas,
  type HeadToHeadPaginatedResponse,
  type PlayerVsPlayerPaginatedResponse,
} from "#src/battles/analytics/battle-statistics-response";
import type { BattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import { battleAnalyticsPaging as paging } from "#src/battles/analytics/battle-analytics-paging.service";
import type { BattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { battleSummaryCalculator as summaryCalculator } from "#src/battles/analytics/battle-summary-calculator.service";
import { combatProfileCalculator } from "#src/battles/analytics/combat-profile-calculator.service";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { BattleCombatProfileRead } from "./battle-combat-profile-read.service.js";
import type { BattleAnalyticsRead } from "./battle-analytics-read.service.js";

const analyticsDecoders = {
  abyssSeasons: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Array(BattleStatisticsResponseSchemas.abyssSeason),
    ),
  ),
  analytics: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.analytics),
  ),
  combatProfile: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.combatProfile),
  ),
  duration: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.duration),
  ),
  headToHead: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.headToHead),
  ),
  phGrowth: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Array(BattleStatisticsResponseSchemas.phGrowth),
    ),
  ),
  playerVsPlayer: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.playerVsPlayer),
  ),
  professionWinRate: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Array(BattleStatisticsResponseSchemas.professionWinRate),
    ),
  ),
  ratingDeltaByOpponent: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Array(BattleStatisticsResponseSchemas.ratingDeltaByOpponent),
    ),
  ),
  ratingGrowth: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Array(BattleStatisticsResponseSchemas.ratingGrowth),
    ),
  ),
  streak: Schema.decodeUnknownSync(
    Schema.fromJsonString(BattleStatisticsResponseSchemas.streak),
  ),
} as const;

export const makeBattleAnalytics = (
  reads: BattleAnalyticsRead,
  combatReads: BattleCombatProfileRead,
  cache: BattleAnalyticsCache,
  queryModule: BattleAnalyticsQuery,
  read: BattleReadBudget,
) => {
  const getBattleAnalytics = (query: BattleAnalyticsCriteria, userId: string) =>
    getCached(
      userId,
      cache.buildAnalyticsCacheKey(userId, query),
      () =>
        Effect.gen(function* () {
          const characterIds = yield* queryModule.getCharacterIds(
            userId,
            query,
          );

          if (characterIds.length === 0) {
            return {
              totalBattles: 0,
              wins: 0,
              losses: 0,
              winRatio: 0,
              totalPH: 0,
            };
          }

          return yield* queryModule.getBattleSummary(
            userId,
            query,
            characterIds,
          );
        }),
      analyticsDecoders.analytics,
    );

  const getAbyssSeasons = (query: AbyssSeasonsQuery, userId: string) =>
    getCached(
      userId,
      cache.buildQueryCacheKey("statistics", "abyss-seasons:v1", userId, query),
      () => getAbyssSeasonsUncached(query, userId),
      analyticsDecoders.abyssSeasons,
    );

  const calculateProfessionWinRate = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("profession-win-rate", userId, query),
      analyticsDecoders.professionWinRate,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return [];
          }

          return yield* queryModule.getProfessionWinRate(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getCombatProfile = (query: BattleStatisticsQuery, userId: string) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("combat-profile", userId, query),
      analyticsDecoders.combatProfile,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return combatProfileCalculator.getEmptyProfile();
          }

          return yield* combatReads.getCombatProfile(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getHeadToHead = (query: BattleStatisticsQuery, userId: string) =>
    Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;

      const cached = yield* getCached(
        userId,
        cache.buildQueryCacheKey(
          "statistics",
          "head-to-head:records:v3",
          userId,
          withoutPagination(query),
        ),
        () =>
          Effect.gen(function* () {
            const characterContext = yield* getCharacterContext(userId, query);

            return {
              hasCharacter: characterContext !== null,
              records: characterContext
                ? yield* reads.getHeadToHead(
                    userId,
                    query,
                    characterContext.characterIds,
                  )
                : [],
            };
          }),
        Schema.decodeUnknownSync(
          Schema.fromJsonString(
            Schema.Struct({
              hasCharacter: Schema.Boolean,
              records: Schema.mutable(
                BattleStatisticsResponseSchemas.headToHead.fields.records,
              ),
            }),
          ),
        ),
      );

      const queryTime = (yield* Clock.currentTimeMillis) - startTime;

      if (!cached.hasCharacter)
        return getEmptyHeadToHeadResponse(query, queryTime);
      const page = paging.paginate(cached.records, query);

      return {
        records: page.records,
        pagination: page.pagination,
        meta: {
          performance: {
            queryTime,
            ...(query.includeTotal && { totalItems: page.totalRecords }),
          },
        },
      };
    });

  const getCurrentStreak = (query: BattleStatisticsQuery, userId: string) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("streak", userId, query),
      analyticsDecoders.streak,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return summaryCalculator.getEmptyStreak();
          }

          return yield* reads.getStreak(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getBattleDurationStats = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("duration", userId, query),
      analyticsDecoders.duration,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return summaryCalculator.getEmptyDurationStats();
          }

          return yield* reads.getDuration(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getPhGrowthTimeSeries = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("ph-growth", userId, query),
      analyticsDecoders.phGrowth,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return [];
          }

          return yield* reads.getPhGrowth(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const invalidateAnalyticsCache = (userId: string) =>
    cache.invalidateUserAnalytics(userId);

  const getRatingGrowthTimeSeries = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("rating-growth", userId, {
        ...query,
        matchmaking: true,
      }),
      analyticsDecoders.ratingGrowth,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return [];
          }

          return yield* reads.getRatingGrowth(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getRatingDeltaByOpponent = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      userId,
      cache.buildStatisticsCacheKey("rating-delta-by-opponent", userId, {
        ...query,
        matchmaking: true,
      }),
      analyticsDecoders.ratingDeltaByOpponent,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);

          if (!characterContext) {
            return [];
          }

          return yield* reads.getRatingByOpponent(
            userId,
            query,
            characterContext.characterIds,
          );
        }),
    );

  const getPlayerVsPlayerBattles = (
    query: PlayerVsPlayerQuery,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;

      const cached = yield* getCached(
        userId,
        cache.buildQueryCacheKey(
          "statistics",
          "player-vs-player:count:v3",
          userId,
          withoutPagination(query),
        ),
        () =>
          Effect.gen(function* () {
            const characterIds = yield* queryModule.getCharacterIds(
              userId,
              query,
            );

            return {
              characterIds,
              total:
                characterIds.length > 0
                  ? yield* reads.getPlayerVsPlayerCount(
                      userId,
                      query,
                      characterIds,
                    )
                  : 0,
            };
          }),
        Schema.decodeUnknownSync(
          Schema.fromJsonString(
            Schema.Struct({
              characterIds: Schema.mutable(Schema.Array(Schema.String)),
              total: Schema.Number,
            }),
          ),
        ),
      );

      if (cached.characterIds.length === 0)
        return getEmptyPlayerVsPlayerResponse(
          query,
          (yield* Clock.currentTimeMillis) - startTime,
        );
      const page = paging.getPage(cached.total, query);

      const battles =
        page.startIndex >= cached.total
          ? []
          : yield* reads
              .getPlayerVsPlayerPage(userId, query, cached.characterIds, {
                offset: page.startIndex,
                size: Math.min(
                  page.pagination.size,
                  cached.total - page.startIndex,
                ),
              })
              .pipe(read);

      return {
        battles,
        pagination: page.pagination,
        meta: {
          performance: {
            queryTime: (yield* Clock.currentTimeMillis) - startTime,
            ...(query.includeTotal && { totalItems: page.totalRecords }),
          },
        },
      };
    });

  const getAbyssSeasonsUncached = (query: AbyssSeasonsQuery, userId: string) =>
    Effect.gen(function* () {
      const characterIds = yield* queryModule.getCharacterIds(userId, query);

      if (characterIds.length === 0) return [];

      return yield* reads.getSeasons(userId, characterIds);
    });

  const getCached = <T>(
    userId: string,
    cacheKey: string,
    factory: () => Effect.Effect<T, unknown>,
    decodeJsonValue: (value: string) => T,
  ) =>
    cache.getOrSetJson(
      userId,
      cacheKey,
      () => factory().pipe(read),
      decodeJsonValue,
    );

  const getCachedStatisticsResult = <T>(
    userId: string,
    cacheKey: string,
    decodeJsonValue: (value: string) => T,
    factory: () => Effect.Effect<T, unknown>,
  ) => getCached(userId, cacheKey, factory, decodeJsonValue);

  const getCharacterContext = (
    userId: string,
    query: { characterId?: string; world?: string },
  ): Effect.Effect<
    {
      characterIds: string[];
    } | null,
    unknown
  > =>
    Effect.gen(function* () {
      const characterIds = yield* queryModule.getCharacterIds(userId, query);

      if (characterIds.length === 0) {
        return null;
      }

      return {
        characterIds,
      };
    });

  const getEmptyHeadToHeadResponse = (
    query: BattleStatisticsQuery,
    queryTime: number,
  ): HeadToHeadPaginatedResponse => {
    return {
      records: [],
      pagination: {
        size: query.size ?? 20,
        hasNext: false,
        hasPrev: false,
      },
      meta: {
        performance: {
          queryTime,
        },
      },
    };
  };

  const getEmptyPlayerVsPlayerResponse = (
    query: PlayerVsPlayerQuery,
    queryTime: number,
  ): PlayerVsPlayerPaginatedResponse => {
    return {
      battles: [],
      pagination: {
        size: query.size ?? 20,
        hasNext: false,
        hasPrev: false,
      },
      meta: {
        performance: {
          queryTime,
        },
      },
    };
  };

  return {
    calculateProfessionWinRate,
    getAbyssSeasons,
    getBattleAnalytics,
    getBattleDurationStats,
    getCombatProfile,
    getCurrentStreak,
    getHeadToHead,
    getPhGrowthTimeSeries,
    getPlayerVsPlayerBattles,
    getRatingDeltaByOpponent,
    getRatingGrowthTimeSeries,
    invalidateAnalyticsCache,
  };
};

export type BattleAnalytics = ReturnType<typeof makeBattleAnalytics>;

const withoutPagination = <T extends BattleStatisticsQuery>(query: T) => {
  const {
    cursor: _cursor,
    size: _size,
    includeTotal: _includeTotal,
    ...filters
  } = query;

  return filters;
};
