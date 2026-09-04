import { and, eq, inArray } from "drizzle-orm";
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
import { battleAnalyticsDomain as domain } from "#src/battles/analytics/battle-analytics-domain.service";
import { battleAnalyticsPaging as paging } from "#src/battles/analytics/battle-analytics-paging.service";
import type { BattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import type {
  AnalyticsBattleOrderBy,
  DateRangeQuery,
} from "#src/battles/analytics/battle-analytics.types";
import { battleSummaryCalculator as summaryCalculator } from "#src/battles/analytics/battle-summary-calculator.service";
import { combatProfileCalculator } from "#src/battles/analytics/combat-profile-calculator.service";
import { headToHeadCalculator } from "#src/battles/analytics/head-to-head-calculator.service";
import { playerVsPlayerCalculator } from "#src/battles/analytics/player-vs-player-calculator.service";
import { abyssSeasonCalculator } from "#src/battles/analytics/abyss-season-calculator.service";
import type { DrizzleDatabase } from "#src/database/database";
import { battleWarriors, battles } from "#src/database/schema";

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

type AnalyticsBattleFilters = DateRangeQuery & {
  world?: string;
  matchmaking?: boolean;
  ph?: boolean;
  minLevel?: number;
  maxLevel?: number;
};

type AnalyticsFetchOptions = {
  userId: string;
  query: AnalyticsBattleFilters;
  characterIds: string[];
  characterIdSet: Set<string>;
  hasFlee?: boolean;
  levelFilter?: "opponent" | "any" | "none";
  orderBy?: AnalyticsBattleOrderBy;
  phFilter?: boolean;
  ratingDeltaNotNull?: boolean;
  ratingNotNull?: boolean;
  whereMode?: "analytics" | "combat-profile";
};

export const makeBattleAnalytics = (
  drizzle: DrizzleDatabase,
  cache: BattleAnalyticsCache,
  queryModule: BattleAnalyticsQuery,
) => {
  const getBattleAnalytics = (query: BattleAnalyticsCriteria, userId: string) =>
    Effect.gen(function* () {
      const cacheKey = cache.buildAnalyticsCacheKey(userId, query);
      const cachedResult = yield* cache.getJson(
        cacheKey,
        analyticsDecoders.analytics,
      );
      if (cachedResult) return cachedResult;

      const characterIds = yield* queryModule.getCharacterIds(userId, query);
      if (characterIds.length === 0) {
        return {
          totalBattles: 0,
          wins: 0,
          losses: 0,
          winRatio: 0,
          totalPH: 0,
        };
      }

      const characterIdSet = domain.toCharacterIdSet(characterIds);
      const filteredBattles = yield* getFilteredAnalyticsBattles({
        userId,
        query,
        characterIds,
        characterIdSet,
      });
      const result = summaryCalculator.calculateBattleAnalytics(
        filteredBattles,
        characterIdSet,
      );
      yield* cache.setJson(cacheKey, result);
      return result;
    });

  const getAbyssSeasons = (query: AbyssSeasonsQuery, userId: string) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey("statistics", "abyss-seasons:v1", userId, query),
      () => getAbyssSeasonsUncached(query, userId),
      analyticsDecoders.abyssSeasons,
    );

  const calculateProfessionWinRate = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("profession-win-rate", userId, query),
      analyticsDecoders.professionWinRate,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return [];
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query,
            ...characterContext,
            hasFlee: false,
          });

          return summaryCalculator.calculateProfessionWinRate(
            filteredBattles,
            characterContext.characterIdSet,
          );
        }),
    );

  const getCombatProfile = (query: BattleStatisticsQuery, userId: string) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("combat-profile", userId, query),
      analyticsDecoders.combatProfile,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return combatProfileCalculator.getEmptyProfile();
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query,
            ...characterContext,
            levelFilter: "any",
            orderBy: { createdAt: "asc" },
            whereMode: "combat-profile",
          });

          return combatProfileCalculator.calculate(
            filteredBattles,
            characterContext.characterIdSet,
          );
        }),
    );

  const getHeadToHead = (query: BattleStatisticsQuery, userId: string) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey("statistics", "head-to-head:v2", userId, query),
      () => getHeadToHeadUncached(query, userId),
      analyticsDecoders.headToHead,
    );

  const getCurrentStreak = (query: BattleStatisticsQuery, userId: string) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("streak", userId, query),
      analyticsDecoders.streak,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return summaryCalculator.getEmptyStreak();
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query,
            ...characterContext,
            hasFlee: false,
            orderBy: { createdAt: "desc" },
          });

          return summaryCalculator.calculateCurrentStreak(
            filteredBattles,
            characterContext.characterIdSet,
          );
        }),
    );

  const getBattleDurationStats = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("duration", userId, query),
      analyticsDecoders.duration,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return summaryCalculator.getEmptyDurationStats();
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query,
            ...characterContext,
            hasFlee: false,
            orderBy: { duration: "asc" },
          });

          return summaryCalculator.calculateBattleDurationStats(
            filteredBattles,
            characterContext.characterIdSet,
          );
        }),
    );

  const getPhGrowthTimeSeries = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("ph-growth", userId, query),
      analyticsDecoders.phGrowth,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return [];
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query,
            ...characterContext,
            orderBy: { createdAt: "asc" },
            phFilter: true,
          });

          return summaryCalculator.calculatePhGrowthTimeSeries(
            filteredBattles,
            characterContext.characterIdSet,
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
      cache.buildStatisticsCacheKey("rating-growth", userId, query, {
        includeBattleFilters: false,
      }),
      analyticsDecoders.ratingGrowth,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return [];
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query: {
              ...query,
              matchmaking: true,
            },
            ...characterContext,
            orderBy: { createdAt: "asc" },
            ratingDeltaNotNull: true,
            ratingNotNull: true,
          });

          return summaryCalculator.calculateRatingGrowthTimeSeries(
            filteredBattles,
          );
        }),
    );

  const getRatingDeltaByOpponent = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("rating-delta-by-opponent", userId, query, {
        includeBattleFilters: false,
      }),
      analyticsDecoders.ratingDeltaByOpponent,
      () =>
        Effect.gen(function* () {
          const characterContext = yield* getCharacterContext(userId, query);
          if (!characterContext) {
            return [];
          }

          const filteredBattles = yield* getFilteredAnalyticsBattles({
            userId,
            query: {
              ...query,
              matchmaking: true,
            },
            ...characterContext,
            hasFlee: false,
            orderBy: { createdAt: "desc" },
            ratingDeltaNotNull: true,
          });

          return summaryCalculator.calculateRatingDeltaByOpponent(
            filteredBattles,
            characterContext.characterIdSet,
          );
        }),
    );

  const getPlayerVsPlayerBattles = (
    query: PlayerVsPlayerQuery,
    userId: string,
  ) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey(
        "statistics",
        "player-vs-player:v2",
        userId,
        query,
      ),
      () => getPlayerVsPlayerBattlesUncached(query, userId),
      analyticsDecoders.playerVsPlayer,
    );

  const getAbyssSeasonsUncached = (query: AbyssSeasonsQuery, userId: string) =>
    Effect.gen(function* () {
      const characterIds = yield* queryModule.getCharacterIds(userId, query);
      if (characterIds.length === 0) return [];

      const fetchedBattles = yield* drizzle.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) =>
            and(
              eq(table.userId, userId),
              eq(table.matchmaking, true),
              queryModule.warriorExists(
                table,
                inArray(battleWarriors.originalId, characterIds),
              ),
            ),
        },
        with: { warriors: true },
        orderBy: { createdAt: "asc" },
      });

      return abyssSeasonCalculator.calculateSeasons(
        domain.inflateBattleRows(fetchedBattles),
        domain.toCharacterIdSet(characterIds),
      );
    });

  const getHeadToHeadUncached = (
    query: BattleStatisticsQuery,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;
      const characterContext = yield* getCharacterContext(userId, {
        characterId: query.characterId,
        world: query.world,
      });

      if (!characterContext) {
        const finishedAt = yield* Clock.currentTimeMillis;
        return getEmptyHeadToHeadResponse(query, finishedAt - startTime);
      }

      const filteredBattles = yield* getFilteredAnalyticsBattles({
        userId,
        query,
        ...characterContext,
        hasFlee: false,
        orderBy: { createdAt: "desc" },
      });
      const records = headToHeadCalculator.calculateRecords(
        filteredBattles,
        characterContext.characterIdSet,
        query,
      );
      const paginated = paging.paginate(records, query);

      return {
        records: paginated.records,
        pagination: paginated.pagination,
        meta: {
          performance: {
            queryTime: (yield* Clock.currentTimeMillis) - startTime,
            ...(query.includeTotal && { totalItems: paginated.totalRecords }),
          },
        },
      };
    });

  const getPlayerVsPlayerBattlesUncached = (
    query: PlayerVsPlayerQuery,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;
      const characterContext = yield* getCharacterContext(userId, {
        characterId: query.characterId,
        world: query.world,
      });

      if (!characterContext) {
        const finishedAt = yield* Clock.currentTimeMillis;
        return getEmptyPlayerVsPlayerResponse(query, finishedAt - startTime);
      }

      const fetchedBattles = yield* getFilteredAnalyticsBattles({
        userId,
        query,
        ...characterContext,
        levelFilter: "none",
        orderBy: { createdAt: "desc" },
      });
      const battlesList = playerVsPlayerCalculator.calculateBattles(
        fetchedBattles,
        characterContext.characterIdSet,
        query,
      );
      const paginated = paging.paginate(battlesList, query);

      return {
        battles: paginated.records,
        pagination: paginated.pagination,
        meta: {
          performance: {
            queryTime: (yield* Clock.currentTimeMillis) - startTime,
            ...(query.includeTotal && { totalItems: paginated.totalRecords }),
          },
        },
      };
    });

  const getCachedStatisticsResult = <T>(
    cacheKey: string,
    decodeJsonValue: (value: string) => T,
    factory: () => Effect.Effect<T, unknown>,
  ) =>
    Effect.gen(function* () {
      const cachedResult = yield* cache.getJson(cacheKey, decodeJsonValue);
      if (cachedResult) {
        return cachedResult;
      }

      const result = yield* factory();
      yield* cache.setJson(cacheKey, result);
      return result;
    });

  const getCharacterContext = (
    userId: string,
    query: { characterId?: string; world?: string },
  ): Effect.Effect<
    {
      characterIds: string[];
      characterIdSet: Set<string>;
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
        characterIdSet: domain.toCharacterIdSet(characterIds),
      };
    });

  const getFilteredAnalyticsBattles = (options: AnalyticsFetchOptions) =>
    Effect.gen(function* () {
      const dateRange = queryModule.getDateRangeFilter(options.query);
      const fetchedBattles = yield* drizzle.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) =>
            options.whereMode === "combat-profile"
              ? queryModule.buildCombatProfileWhere(table, {
                  userId: options.userId,
                  world: options.query.world,
                  ...dateRange,
                  matchmaking: options.query.matchmaking,
                  characterIds: options.characterIds,
                  phFilter: options.phFilter ?? options.query.ph,
                })
              : queryModule.buildAnalyticsWhere(table, {
                  userId: options.userId,
                  world: options.query.world,
                  ...dateRange,
                  matchmaking: options.query.matchmaking,
                  characterIds: options.characterIds,
                  phFilter: options.phFilter ?? options.query.ph,
                  hasFlee: options.hasFlee,
                  ratingDeltaNotNull: options.ratingDeltaNotNull,
                  ratingNotNull: options.ratingNotNull,
                }),
        },
        with: { warriors: true },
        ...(options.orderBy ? { orderBy: options.orderBy } : {}),
      });

      const inflatedBattles = domain.inflateBattleRows(fetchedBattles);

      if (options.levelFilter === "none") {
        return inflatedBattles;
      }

      if (options.levelFilter === "any") {
        return domain.filterByAnyOpponentLevel(
          inflatedBattles,
          options.characterIdSet,
          options.query.minLevel,
          options.query.maxLevel,
        );
      }

      return domain.filterByOpponentLevel(
        inflatedBattles,
        options.characterIdSet,
        options.query.minLevel,
        options.query.maxLevel,
      );
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
