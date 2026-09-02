import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { QueryBattleAnalyticsDto } from "#src/battles/dto/query-battle-analytics.dto";
import type {
  QueryAbyssSeasonsDto,
  QueryBattleStatisticsDto,
  QueryPlayerVsPlayerDto,
} from "#src/battles/dto/query-battle-statistics.dto";
import type {
  AbyssSeasonDto,
  BattleAnalyticsDto,
  BattleDurationStatsDto,
  CombatProfileDto,
  HeadToHeadPaginatedResponse,
  PhGrowthDataPointDto,
  PlayerVsPlayerPaginatedResponse,
  ProfessionWinRateDto,
  RatingDeltaByOpponentDto,
  RatingGrowthDataPointDto,
  StreakDto,
} from "#src/battles/dto/battle-statistics-response.dto";
import type { BattleAnalyticsCache } from "#src/battles/services/battle-analytics-cache.service";
import type { BattleAnalyticsDomain } from "#src/battles/services/battle-analytics-domain.service";
import type { BattleAnalyticsPaging } from "#src/battles/services/battle-analytics-paging.service";
import type { BattleAnalyticsQuery } from "#src/battles/services/battle-analytics-query.service";
import type {
  AnalyticsBattleOrderBy,
  DateRangeQuery,
  InflatedBattleWithWarriors,
} from "#src/battles/services/battle-analytics.types";
import type { BattleSummaryCalculator } from "#src/battles/services/battle-summary-calculator.service";
import type { CombatProfileCalculator } from "#src/battles/services/combat-profile-calculator.service";
import type { HeadToHeadCalculator } from "#src/battles/services/head-to-head-calculator.service";
import type { PlayerVsPlayerCalculator } from "#src/battles/services/player-vs-player-calculator.service";
import type { AbyssSeasonCalculator } from "#src/battles/services/abyss-season-calculator.service";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import { battleWarriors, battles } from "#src/shared/modules/drizzle/schema";

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
  domain: BattleAnalyticsDomain,
  paging: BattleAnalyticsPaging,
  summaryCalculator: BattleSummaryCalculator,
  combatProfileCalculator: CombatProfileCalculator,
  headToHeadCalculator: HeadToHeadCalculator,
  playerVsPlayerCalculator: PlayerVsPlayerCalculator,
  abyssSeasonCalculator: AbyssSeasonCalculator,
) => {
  const getBattleAnalytics = (query: QueryBattleAnalyticsDto, userId: string) =>
    Effect.gen(function* () {
      const cacheKey = cache.buildAnalyticsCacheKey(userId, query);
      const cachedResult = yield* cache.getJson<BattleAnalyticsDto>(cacheKey);
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

  const getAbyssSeasons = (query: QueryAbyssSeasonsDto, userId: string) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey("statistics", "abyss-seasons:v1", userId, query),
      () => getAbyssSeasonsUncached(query, userId),
    );

  const calculateProfessionWinRate = (
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("profession-win-rate", userId, query),
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

  const getCombatProfile = (query: QueryBattleStatisticsDto, userId: string) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("combat-profile", userId, query),
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

  const getHeadToHead = (query: QueryBattleStatisticsDto, userId: string) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey("statistics", "head-to-head:v2", userId, query),
      () => getHeadToHeadUncached(query, userId),
    );

  const getCurrentStreak = (query: QueryBattleStatisticsDto, userId: string) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("streak", userId, query),
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
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("duration", userId, query),
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
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("ph-growth", userId, query),
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
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("rating-growth", userId, query, {
        includeBattleFilters: false,
      }),
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
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    getCachedStatisticsResult(
      cache.buildStatisticsCacheKey("rating-delta-by-opponent", userId, query, {
        includeBattleFilters: false,
      }),
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
    query: QueryPlayerVsPlayerDto,
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
    );

  const getAbyssSeasonsUncached = (
    query: QueryAbyssSeasonsDto,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const characterIds = yield* queryModule.getCharacterIds(userId, query);
      if (characterIds.length === 0) return [];

      const fetchedBattles = yield* Effect.tryPromise({
        try: () =>
          drizzle.run(
            drizzle.db.query.battles.findMany({
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
            }),
          ),
        catch: (cause) => cause,
      });

      return abyssSeasonCalculator.calculateSeasons(
        domain.inflateBattleRows(fetchedBattles),
        domain.toCharacterIdSet(characterIds),
      );
    });

  const getHeadToHeadUncached = (
    query: QueryBattleStatisticsDto,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const startTime = Date.now();
      const characterContext = yield* getCharacterContext(userId, {
        characterId: query.characterId,
        world: query.world,
      });

      if (!characterContext) {
        return getEmptyHeadToHeadResponse(query, startTime);
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
            queryTime: Date.now() - startTime,
            ...(query.includeTotal && { totalItems: paginated.totalRecords }),
          },
        },
      };
    });

  const getPlayerVsPlayerBattlesUncached = (
    query: QueryPlayerVsPlayerDto,
    userId: string,
  ) =>
    Effect.gen(function* () {
      const startTime = Date.now();
      const characterContext = yield* getCharacterContext(userId, {
        characterId: query.characterId,
        world: query.world,
      });

      if (!characterContext) {
        return getEmptyPlayerVsPlayerResponse(query, startTime);
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
            queryTime: Date.now() - startTime,
            ...(query.includeTotal && { totalItems: paginated.totalRecords }),
          },
        },
      };
    });

  const getCachedStatisticsResult = <T>(
    cacheKey: string,
    factory: () => Effect.Effect<T, unknown>,
  ) =>
    Effect.gen(function* () {
      const cachedResult = yield* cache.getJson<T>(cacheKey);
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
      const fetchedBattles = yield* Effect.tryPromise({
        try: () =>
          drizzle.run(
            drizzle.db.query.battles.findMany({
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
            }),
          ),
        catch: (cause) => cause,
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
    query: QueryBattleStatisticsDto,
    startTime: number,
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
          queryTime: Date.now() - startTime,
        },
      },
    };
  };

  const getEmptyPlayerVsPlayerResponse = (
    query: QueryPlayerVsPlayerDto,
    startTime: number,
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
          queryTime: Date.now() - startTime,
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
