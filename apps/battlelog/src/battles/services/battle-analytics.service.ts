import { and, eq, inArray } from "drizzle-orm";
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
import { BattleAnalyticsCacheService } from "#src/battles/services/battle-analytics-cache.service";
import { BattleAnalyticsDomainService } from "#src/battles/services/battle-analytics-domain.service";
import { BattleAnalyticsPagingService } from "#src/battles/services/battle-analytics-paging.service";
import { BattleAnalyticsQueryService } from "#src/battles/services/battle-analytics-query.service";
import type {
  AnalyticsBattleOrderBy,
  DateRangeQuery,
  InflatedBattleWithWarriors,
} from "#src/battles/services/battle-analytics.types";
import { BattleSummaryCalculatorService } from "#src/battles/services/battle-summary-calculator.service";
import { CombatProfileCalculatorService } from "#src/battles/services/combat-profile-calculator.service";
import { HeadToHeadCalculatorService } from "#src/battles/services/head-to-head-calculator.service";
import { PlayerVsPlayerCalculatorService } from "#src/battles/services/player-vs-player-calculator.service";
import { AbyssSeasonCalculatorService } from "#src/battles/services/abyss-season-calculator.service";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
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

export class BattleAnalyticsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cacheService: BattleAnalyticsCacheService,
    private readonly queryService: BattleAnalyticsQueryService,
    private readonly domainService: BattleAnalyticsDomainService,
    private readonly pagingService: BattleAnalyticsPagingService,
    private readonly summaryCalculator: BattleSummaryCalculatorService,
    private readonly combatProfileCalculator: CombatProfileCalculatorService,
    private readonly headToHeadCalculator: HeadToHeadCalculatorService,
    private readonly playerVsPlayerCalculator: PlayerVsPlayerCalculatorService,
    private readonly abyssSeasonCalculator: AbyssSeasonCalculatorService,
  ) {}

  async getBattleAnalytics(
    query: QueryBattleAnalyticsDto,
    userId: string,
  ): Promise<BattleAnalyticsDto> {
    const cacheKey = this.cacheService.buildAnalyticsCacheKey(userId, query);
    const cachedResult =
      await this.cacheService.getJson<BattleAnalyticsDto>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const characterIds = await this.queryService.getCharacterIds(userId, query);
    if (characterIds.length === 0) {
      return {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      };
    }

    const characterIdSet = this.domainService.toCharacterIdSet(characterIds);
    const filteredBattles = await this.getFilteredAnalyticsBattles({
      userId,
      query,
      characterIds,
      characterIdSet,
    });

    const result = this.summaryCalculator.calculateBattleAnalytics(
      filteredBattles,
      characterIdSet,
    );

    await this.cacheService.setJson(cacheKey, result);
    return result;
  }

  async getAbyssSeasons(
    query: QueryAbyssSeasonsDto,
    userId: string,
  ): Promise<AbyssSeasonDto[]> {
    return this.cacheService.getOrSetJson(
      this.cacheService.buildQueryCacheKey(
        "statistics",
        "abyss-seasons:v1",
        userId,
        query,
      ),
      () => this.getAbyssSeasonsUncached(query, userId),
    );
  }

  async calculateProfessionWinRate(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<ProfessionWinRateDto[]> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey(
        "profession-win-rate",
        userId,
        query,
      ),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return [];
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
          userId,
          query,
          ...characterContext,
          hasFlee: false,
        });

        return this.summaryCalculator.calculateProfessionWinRate(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async getCombatProfile(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<CombatProfileDto> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey(
        "combat-profile",
        userId,
        query,
      ),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return this.combatProfileCalculator.getEmptyProfile();
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
          userId,
          query,
          ...characterContext,
          levelFilter: "any",
          orderBy: { createdAt: "asc" },
          whereMode: "combat-profile",
        });

        return this.combatProfileCalculator.calculate(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async getHeadToHead(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadPaginatedResponse> {
    return this.cacheService.getOrSetJson(
      this.cacheService.buildQueryCacheKey(
        "statistics",
        "head-to-head:v2",
        userId,
        query,
      ),
      () => this.getHeadToHeadUncached(query, userId),
    );
  }

  async getCurrentStreak(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<StreakDto> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey("streak", userId, query),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return this.summaryCalculator.getEmptyStreak();
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
          userId,
          query,
          ...characterContext,
          hasFlee: false,
          orderBy: { createdAt: "desc" },
        });

        return this.summaryCalculator.calculateCurrentStreak(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async getBattleDurationStats(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<BattleDurationStatsDto> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey("duration", userId, query),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return this.summaryCalculator.getEmptyDurationStats();
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
          userId,
          query,
          ...characterContext,
          hasFlee: false,
          orderBy: { duration: "asc" },
        });

        return this.summaryCalculator.calculateBattleDurationStats(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async getPhGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<PhGrowthDataPointDto[]> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey("ph-growth", userId, query),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return [];
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
          userId,
          query,
          ...characterContext,
          orderBy: { createdAt: "asc" },
          phFilter: true,
        });

        return this.summaryCalculator.calculatePhGrowthTimeSeries(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async invalidateAnalyticsCache(userId: string): Promise<void> {
    await this.cacheService.invalidateUserAnalytics(userId);
  }

  async getRatingGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<RatingGrowthDataPointDto[]> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey(
        "rating-growth",
        userId,
        query,
        { includeBattleFilters: false },
      ),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return [];
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
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

        return this.summaryCalculator.calculateRatingGrowthTimeSeries(
          filteredBattles,
        );
      },
    );
  }

  async getRatingDeltaByOpponent(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<RatingDeltaByOpponentDto[]> {
    return this.getCachedStatisticsResult(
      this.cacheService.buildStatisticsCacheKey(
        "rating-delta-by-opponent",
        userId,
        query,
        { includeBattleFilters: false },
      ),
      async () => {
        const characterContext = await this.getCharacterContext(userId, query);
        if (!characterContext) {
          return [];
        }

        const filteredBattles = await this.getFilteredAnalyticsBattles({
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

        return this.summaryCalculator.calculateRatingDeltaByOpponent(
          filteredBattles,
          characterContext.characterIdSet,
        );
      },
    );
  }

  async getPlayerVsPlayerBattles(
    query: QueryPlayerVsPlayerDto,
    userId: string,
  ): Promise<PlayerVsPlayerPaginatedResponse> {
    return this.cacheService.getOrSetJson(
      this.cacheService.buildQueryCacheKey(
        "statistics",
        "player-vs-player:v2",
        userId,
        query,
      ),
      () => this.getPlayerVsPlayerBattlesUncached(query, userId),
    );
  }

  private async getAbyssSeasonsUncached(
    query: QueryAbyssSeasonsDto,
    userId: string,
  ): Promise<AbyssSeasonDto[]> {
    const characterIds = await this.queryService.getCharacterIds(userId, query);
    if (characterIds.length === 0) {
      return [];
    }

    const fetchedBattles = await this.drizzle.run(
      this.drizzle.db.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) =>
            and(
              eq(table.userId, userId),
              eq(table.matchmaking, true),
              this.queryService.warriorExists(
                table,
                inArray(battleWarriors.originalId, characterIds),
              ),
            ),
        },
        with: { warriors: true },
        orderBy: { createdAt: "asc" },
      }),
    );

    return this.abyssSeasonCalculator.calculateSeasons(
      this.domainService.inflateBattleRows(fetchedBattles),
      this.domainService.toCharacterIdSet(characterIds),
    );
  }

  private async getHeadToHeadUncached(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadPaginatedResponse> {
    const startTime = Date.now();
    const characterContext = await this.getCharacterContext(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (!characterContext) {
      return this.getEmptyHeadToHeadResponse(query, startTime);
    }

    const filteredBattles = await this.getFilteredAnalyticsBattles({
      userId,
      query,
      ...characterContext,
      hasFlee: false,
      orderBy: { createdAt: "desc" },
    });
    const records = this.headToHeadCalculator.calculateRecords(
      filteredBattles,
      characterContext.characterIdSet,
      query,
    );
    const paginated = this.pagingService.paginate(records, query);

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
  }

  private async getPlayerVsPlayerBattlesUncached(
    query: QueryPlayerVsPlayerDto,
    userId: string,
  ): Promise<PlayerVsPlayerPaginatedResponse> {
    const startTime = Date.now();
    const characterContext = await this.getCharacterContext(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (!characterContext) {
      return this.getEmptyPlayerVsPlayerResponse(query, startTime);
    }

    const fetchedBattles = await this.getFilteredAnalyticsBattles({
      userId,
      query,
      ...characterContext,
      levelFilter: "none",
      orderBy: { createdAt: "desc" },
    });
    const battlesList = this.playerVsPlayerCalculator.calculateBattles(
      fetchedBattles,
      characterContext.characterIdSet,
      query,
    );
    const paginated = this.pagingService.paginate(battlesList, query);

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
  }

  private async getCachedStatisticsResult<T>(
    cacheKey: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cachedResult = await this.cacheService.getJson<T>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await factory();
    await this.cacheService.setJson(cacheKey, result);
    return result;
  }

  private async getCharacterContext(
    userId: string,
    query: { characterId?: string; world?: string },
  ): Promise<{
    characterIds: string[];
    characterIdSet: Set<string>;
  } | null> {
    const characterIds = await this.queryService.getCharacterIds(userId, query);
    if (characterIds.length === 0) {
      return null;
    }

    return {
      characterIds,
      characterIdSet: this.domainService.toCharacterIdSet(characterIds),
    };
  }

  private async getFilteredAnalyticsBattles(
    options: AnalyticsFetchOptions,
  ): Promise<InflatedBattleWithWarriors[]> {
    const dateRange = this.queryService.getDateRangeFilter(options.query);
    const fetchedBattles = await this.drizzle.run(
      this.drizzle.db.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) =>
            options.whereMode === "combat-profile"
              ? this.queryService.buildCombatProfileWhere(table, {
                  userId: options.userId,
                  world: options.query.world,
                  ...dateRange,
                  matchmaking: options.query.matchmaking,
                  characterIds: options.characterIds,
                  phFilter: options.phFilter ?? options.query.ph,
                })
              : this.queryService.buildAnalyticsWhere(table, {
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
    );

    const inflatedBattles =
      this.domainService.inflateBattleRows(fetchedBattles);

    if (options.levelFilter === "none") {
      return inflatedBattles;
    }

    if (options.levelFilter === "any") {
      return this.domainService.filterByAnyOpponentLevel(
        inflatedBattles,
        options.characterIdSet,
        options.query.minLevel,
        options.query.maxLevel,
      );
    }

    return this.domainService.filterByOpponentLevel(
      inflatedBattles,
      options.characterIdSet,
      options.query.minLevel,
      options.query.maxLevel,
    );
  }

  private getEmptyHeadToHeadResponse(
    query: QueryBattleStatisticsDto,
    startTime: number,
  ): HeadToHeadPaginatedResponse {
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
  }

  private getEmptyPlayerVsPlayerResponse(
    query: QueryPlayerVsPlayerDto,
    startTime: number,
  ): PlayerVsPlayerPaginatedResponse {
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
  }
}
