import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, eq, exists, gt, inArray, isNotNull, type SQL } from "drizzle-orm";
import type { QueryBattleAnalyticsDto } from "src/battles/dto/query-battle-analytics.dto";
import type {
  QueryBattleStatisticsDto,
  QueryPlayerVsPlayerDto,
} from "src/battles/dto/query-battle-statistics.dto";
import type {
  ProfessionWinRateDto,
  HeadToHeadPaginatedResponse,
  StreakDto,
  BattleDurationStatsDto,
  PhGrowthDataPointDto,
  RatingGrowthDataPointDto,
  RatingDeltaByOpponentDto,
  PlayerVsPlayerPaginatedResponse,
  CombatProfileDto,
} from "src/battles/dto/battle-statistics-response.dto";
import {
  inflateBattleWarriorsInBattles,
  type InflatedBattleWarrior,
} from "src/battles/battle-warrior-stats";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  battleWarriors,
  type Battle,
  type BattleWarrior,
  type battles,
} from "src/shared/modules/drizzle/schema";
import { RedisService } from "@lootlog/nest-shared/redis";

type StoredBattleWithWarriors = Battle & { warriors: BattleWarrior[] };
type InflatedBattleWithWarriors = Battle & {
  warriors: InflatedBattleWarrior[];
};

@Injectable()
export class BattleAnalyticsService {
  private readonly logger = new Logger(BattleAnalyticsService.name);
  private readonly ANALYTICS_CACHE_PREFIX = "analytics";
  private readonly ANALYTICS_CACHE_TTL = 5 * 60;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redisService: RedisService,
  ) {}

  private warriorExists(
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) {
    return exists(
      this.drizzle.db
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );
  }

  private inflateBattleRows(
    fetchedBattles: StoredBattleWithWarriors[],
  ): InflatedBattleWithWarriors[] {
    return inflateBattleWarriorsInBattles(fetchedBattles);
  }

  private getCachedAnalyticsResult<T>(
    cacheKey: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    return this.redisService.getOrSetJsonBestEffort({
      key: cacheKey,
      ttlSeconds: this.ANALYTICS_CACHE_TTL,
      factory,
      onError: (error) =>
        this.logger.warn("Battle analytics cache unavailable", error),
    });
  }

  async getBattleAnalytics(
    query: QueryBattleAnalyticsDto,
    userId: string,
  ): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    winRatio: number;
    totalPH: number;
  }> {
    const cacheKey = this.buildAnalyticsCacheKey(userId, query);

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    let characterIds: string[] = [];

    if (query.characterId) {
      const userCharacter =
        await this.drizzle.db.query.userCharacters.findFirst({
          where: {
            userId,
            characterId: query.characterId,
            ...(query.world && { world: query.world }),
          },
        });

      if (!userCharacter) {
        throw new NotFoundException(
          `Character ${query.characterId} not found for user`,
        );
      }

      characterIds = [query.characterId];
    } else {
      const userChars = await this.drizzle.db.query.userCharacters.findMany({
        where: {
          userId,
          ...(query.world && { world: query.world }),
        },
        columns: { characterId: true },
      });

      characterIds = userChars.map((c) => c.characterId);
    }

    if (characterIds.length === 0) {
      return {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      };
    }

    const startDate = this.getDateFilter(query.period);

    const analyticsParams = {
      userId,
      world: query.world,
      startDate,
      matchmaking: query.matchmaking,
      characterIds,
      phFilter: query.ph,
    };

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, analyticsParams),
      },
      with: { warriors: true },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    let wins = 0;
    let losses = 0;
    let totalPH = 0;

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );

      if (userWarrior) {
        totalPH += userWarrior.ph;

        if (!battle.hasFlee) {
          if (userWarrior.team === battle.winningTeam) {
            wins++;
          } else if (userWarrior.team === battle.losingTeam) {
            losses++;
          }
        }
      }
    }

    const totalBattles = wins + losses;
    const winRatio = totalBattles > 0 ? wins / totalBattles : 0;

    const result = {
      totalBattles,
      wins,
      losses,
      winRatio: Math.round(winRatio * 10000) / 100,
      totalPH,
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async calculateProfessionWinRate(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<ProfessionWinRateDto[]> {
    const cacheKey = this.buildStatisticsCacheKey(
      "profession-win-rate",
      userId,
      query,
    );

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
            phFilter: query.ph,
            hasFlee: false,
          }),
      },
      with: { warriors: true },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const professionStats = new Map<string, { wins: number; losses: number }>();

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => !characterIds.includes(w.originalId),
      );

      if (userWarrior && opponentWarrior) {
        const prof = opponentWarrior.prof;
        const stats = professionStats.get(prof) || { wins: 0, losses: 0 };

        if (userWarrior.team === battle.winningTeam) {
          stats.wins++;
        } else if (userWarrior.team === battle.losingTeam) {
          stats.losses++;
        }

        professionStats.set(prof, stats);
      }
    }

    const result = Array.from(professionStats.entries())
      .map(([prof, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        return {
          prof,
          wins: stats.wins,
          losses: stats.losses,
          totalBattles,
          winRate:
            totalBattles > 0
              ? Math.round((stats.wins / totalBattles) * 10000) / 100
              : 0,
        };
      })
      .sort((a, b) => b.totalBattles - a.totalBattles);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async getCombatProfile(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<CombatProfileDto> {
    const cacheKey = this.buildStatisticsCacheKey(
      "combat-profile",
      userId,
      query,
    );

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);
    if (characterIds.length === 0) {
      return this.getEmptyCombatProfile();
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildCombatProfileWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
            phFilter: query.ph,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "asc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isAnyOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const profile = this.calculateCombatProfile(filteredBattles, characterIds);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(profile),
      this.ANALYTICS_CACHE_TTL,
    );

    return profile;
  }

  async getHeadToHead(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadPaginatedResponse> {
    return this.getCachedAnalyticsResult(
      this.buildQueryCacheKey("statistics", "head-to-head", userId, query),
      () => this.getHeadToHeadUncached(query, userId),
    );
  }

  private async getHeadToHeadUncached(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadPaginatedResponse> {
    const startTime = Date.now();

    const characterIds = await this.getCharacterIds(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (characterIds.length === 0) {
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

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
            phFilter: query.ph,
            hasFlee: false,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "desc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const opponentStats = new Map<
      string,
      {
        name: string;
        icon: string;
        prof: string;
        lvl: number;
        wins: number;
        losses: number;
        lastBattleDate: Date;
        totalRatingDelta: number;
        battlesWithRating: number;
      }
    >();

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => !characterIds.includes(w.originalId),
      );

      if (userWarrior && opponentWarrior) {
        const opponentId = opponentWarrior.originalId;
        const stats = opponentStats.get(opponentId) ?? {
          name: opponentWarrior.name,
          icon: opponentWarrior.icon,
          prof: opponentWarrior.prof,
          lvl: opponentWarrior.lvl,
          wins: 0,
          losses: 0,
          lastBattleDate: battle.createdAt,
          totalRatingDelta: 0,
          battlesWithRating: 0,
        };

        if (userWarrior.team === battle.winningTeam) {
          stats.wins++;
        } else if (userWarrior.team === battle.losingTeam) {
          stats.losses++;
        }

        if (query.matchmaking && battle.ratingDelta !== null) {
          stats.totalRatingDelta += battle.ratingDelta;
          if (battle.ratingDelta !== 0) {
            stats.battlesWithRating++;
          }
        }

        if (battle.createdAt > stats.lastBattleDate) {
          stats.lastBattleDate = battle.createdAt;
        }

        opponentStats.set(opponentId, stats);
      }
    }

    const allRecords = Array.from(opponentStats.entries()).map(
      ([opponentId, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        const baseRecord = {
          opponentId,
          opponentName: stats.name,
          opponentIcon: stats.icon,
          opponentProf: stats.prof,
          opponentLvl: stats.lvl,
          wins: stats.wins,
          losses: stats.losses,
          totalBattles,
          winRate: totalBattles > 0 ? (stats.wins / totalBattles) * 100 : 0,
          lastBattleDate: stats.lastBattleDate.toISOString(),
          totalRatingDelta: query.matchmaking
            ? stats.totalRatingDelta
            : undefined,
          avgRatingDelta: query.matchmaking
            ? stats.battlesWithRating > 0
              ? Math.round(
                  (stats.totalRatingDelta / stats.battlesWithRating) * 100,
                ) / 100
              : 0
            : undefined,
        };

        return baseRecord;
      },
    );

    let filteredRecords = allRecords;

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredRecords = filteredRecords.filter((record) =>
        record.opponentName.toLowerCase().includes(searchLower),
      );
    }

    if (query.minBattles) {
      filteredRecords = filteredRecords.filter(
        (record) => record.totalBattles >= query.minBattles!,
      );
    }

    const sortBy = query.sortBy ?? "totalBattles";
    const sortOrder = query.sortOrder ?? "desc";
    filteredRecords.sort((a, b) => {
      let compareResult = 0;

      switch (sortBy) {
        case "wins":
          compareResult = a.wins - b.wins;
          break;
        case "losses":
          compareResult = a.losses - b.losses;
          break;
        case "totalBattles":
          compareResult = a.totalBattles - b.totalBattles;
          break;
        case "winRate":
          compareResult = a.winRate - b.winRate;
          break;
        case "lastBattleDate":
          compareResult =
            new Date(a.lastBattleDate).getTime() -
            new Date(b.lastBattleDate).getTime();
          break;
        case "totalRatingDelta":
          compareResult = (a.totalRatingDelta ?? 0) - (b.totalRatingDelta ?? 0);
          break;
        case "avgRatingDelta":
          compareResult = (a.avgRatingDelta ?? 0) - (b.avgRatingDelta ?? 0);
          break;
      }

      return sortOrder === "desc" ? -compareResult : compareResult;
    });

    const totalRecords = filteredRecords.length;

    let startIndex = 0;
    if (query.cursor) {
      try {
        const decodedCursor = Buffer.from(query.cursor, "base64").toString(
          "utf-8",
        );
        const cursorIndex = Number.parseInt(decodedCursor, 10);
        if (!Number.isNaN(cursorIndex) && cursorIndex >= 0) {
          startIndex = cursorIndex;
        }
      } catch {
        startIndex = 0;
      }
    }

    const size = query.size ?? 20;
    const endIndex = startIndex + size;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    const hasNext = endIndex < totalRecords;
    const hasPrev = startIndex > 0;
    const nextCursor = hasNext
      ? Buffer.from(endIndex.toString()).toString("base64")
      : undefined;
    const previousCursor = hasPrev
      ? Buffer.from(Math.max(0, startIndex - size).toString()).toString(
          "base64",
        )
      : undefined;

    const queryTime = Date.now() - startTime;

    return {
      records: paginatedRecords,
      pagination: {
        size,
        hasNext,
        hasPrev,
        nextCursor,
        previousCursor,
        ...(query.includeTotal && { total: totalRecords }),
      },
      meta: {
        performance: {
          queryTime,
          ...(query.includeTotal && { totalItems: totalRecords }),
        },
      },
    };
  }

  async getCurrentStreak(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<StreakDto> {
    const cacheKey = this.buildStatisticsCacheKey("streak", userId, query);

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return {
        current: { type: "none", count: 0 },
        longest: { wins: 0, losses: 0 },
      };
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
            phFilter: query.ph,
            hasFlee: false,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "desc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    if (filteredBattles.length === 0) {
      return {
        current: { type: "none", count: 0 },
        longest: { wins: 0, losses: 0 },
      };
    }

    let currentStreak = 0;
    let currentType: "wins" | "losses" | "none" = "none";
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;
    let isCurrentStreakActive = true;

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      if (!userWarrior) continue;

      const isWin = userWarrior.team === battle.winningTeam;

      if (isCurrentStreakActive) {
        if (currentType === "none") {
          currentType = isWin ? "wins" : "losses";
          currentStreak = 1;
        } else if (
          (currentType === "wins" && isWin) ||
          (currentType === "losses" && !isWin)
        ) {
          currentStreak++;
        } else {
          isCurrentStreakActive = false;
        }
      }

      if (isWin) {
        tempWinStreak++;
        if (tempWinStreak > longestWinStreak) {
          longestWinStreak = tempWinStreak;
        }
        tempLossStreak = 0;
      } else {
        tempLossStreak++;
        if (tempLossStreak > longestLossStreak) {
          longestLossStreak = tempLossStreak;
        }
        tempWinStreak = 0;
      }
    }

    const result = {
      current: { type: currentType, count: currentStreak },
      longest: { wins: longestWinStreak, losses: longestLossStreak },
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async getBattleDurationStats(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<BattleDurationStatsDto> {
    const cacheKey = this.buildStatisticsCacheKey("duration", userId, query);

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return {
        avgWinDuration: 0,
        avgLossDuration: 0,
        fastest: null,
        longest: null,
      };
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
            phFilter: query.ph,
            hasFlee: false,
          }),
      },
      with: { warriors: true },
      orderBy: { duration: "asc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    if (filteredBattles.length === 0) {
      return {
        avgWinDuration: 0,
        avgLossDuration: 0,
        fastest: null,
        longest: null,
      };
    }

    let totalWinDuration = 0;
    let totalLossDuration = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      if (!userWarrior) continue;

      const isWin = userWarrior.team === battle.winningTeam;

      if (isWin) {
        totalWinDuration += battle.duration;
        winCount++;
      } else {
        totalLossDuration += battle.duration;
        lossCount++;
      }
    }

    const avgWinDuration =
      winCount > 0 ? Math.round(totalWinDuration / winCount) : 0;
    const avgLossDuration =
      lossCount > 0 ? Math.round(totalLossDuration / lossCount) : 0;

    const fastest = filteredBattles[0]
      ? {
          duration: filteredBattles[0].duration,
          battleId: filteredBattles[0].id,
        }
      : null;
    const longest = filteredBattles[filteredBattles.length - 1]
      ? {
          duration: filteredBattles[filteredBattles.length - 1].duration,
          battleId: filteredBattles[filteredBattles.length - 1].id,
        }
      : null;

    const result = {
      avgWinDuration,
      avgLossDuration,
      fastest,
      longest,
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async getPhGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<PhGrowthDataPointDto[]> {
    const cacheKey = this.buildStatisticsCacheKey("ph-growth", userId, query);

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) => {
          const conditions: (SQL | undefined)[] = [
            eq(table.userId, userId),
            eq(table.type, "1v1"),
            ...(query.world ? [eq(table.world, query.world)] : []),
            ...(startDate ? [gt(table.createdAt, startDate)] : []),
            ...(query.matchmaking !== undefined
              ? [eq(table.matchmaking, query.matchmaking)]
              : []),
            this.warriorExists(
              table,
              inArray(battleWarriors.originalId, characterIds),
              gt(battleWarriors.ph, 0),
            ),
          ];
          return and(...conditions);
        },
      },
      with: { warriors: true },
      orderBy: { createdAt: "asc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    let cumulativePh = 0;
    const result: PhGrowthDataPointDto[] = filteredBattles.map((battle) => {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const ph = userWarrior?.ph ?? 0;
      cumulativePh += ph;

      return {
        date: battle.createdAt.toISOString(),
        ph,
        cumulativePh,
        battleId: battle.id,
      };
    });

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async invalidateAnalyticsCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `${this.ANALYTICS_CACHE_PREFIX}:${userId}:*`,
        `statistics:*:${userId}:*`,
        `battle-characters:*:${userId}*`,
        `battle-worlds:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.redisService.deleteByPattern(pattern);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate analytics cache for user ${userId}:`,
        error,
      );
    }
  }

  private async getCharacterIds(
    userId: string,
    query: { characterId?: string; world?: string },
  ): Promise<string[]> {
    return this.getCachedAnalyticsResult(
      this.buildQueryCacheKey("battle-characters", "ids", userId, query),
      () => this.getCharacterIdsUncached(userId, query),
    );
  }

  private async getCharacterIdsUncached(
    userId: string,
    query: { characterId?: string; world?: string },
  ): Promise<string[]> {
    if (query.characterId) {
      const userCharacter =
        await this.drizzle.db.query.userCharacters.findFirst({
          where: {
            userId,
            characterId: query.characterId,
            ...(query.world && { world: query.world }),
          },
        });

      if (!userCharacter) {
        throw new NotFoundException(
          `Character ${query.characterId} not found for user`,
        );
      }

      return [query.characterId];
    }

    const userChars = await this.drizzle.db.query.userCharacters.findMany({
      where: {
        userId,
        ...(query.world && { world: query.world }),
      },
      columns: { characterId: true },
    });

    return userChars.map((c) => c.characterId);
  }

  private getDateFilter(period?: string): Date | undefined {
    if (!period || period === "all") return undefined;

    const now = new Date();
    const periodMap: Record<string, number> = {
      "24h": 1,
      "3d": 3,
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
      "180d": 180,
    };

    const days = periodMap[period];
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private buildAnalyticsCacheKey(
    userId: string,
    query: QueryBattleAnalyticsDto,
  ): string {
    return [
      this.ANALYTICS_CACHE_PREFIX,
      userId,
      this.formatCacheSegment(query.characterId),
      this.formatCacheSegment(query.world),
      this.formatCacheSegment(query.period),
      this.formatLevelCacheSegment(query),
      this.formatBooleanCacheSegment(query.ph, "ph"),
      this.formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
    ].join(":");
  }

  private buildStatisticsCacheKey(
    metric: string,
    userId: string,
    query: QueryBattleStatisticsDto,
    options: { includeBattleFilters?: boolean } = {},
  ): string {
    const cacheKeySegments = [
      "statistics",
      metric,
      userId,
      this.formatCacheSegment(query.characterId),
      this.formatCacheSegment(query.world),
      this.formatCacheSegment(query.period),
      this.formatLevelCacheSegment(query),
    ];

    if (options.includeBattleFilters ?? true) {
      cacheKeySegments.push(
        this.formatBooleanCacheSegment(query.ph, "ph"),
        this.formatBooleanCacheSegment(query.matchmaking, "matchmaking"),
      );
    }

    return cacheKeySegments.join(":");
  }

  private buildQueryCacheKey(
    prefix: string,
    metric: string,
    userId: string,
    query: Record<string, unknown>,
  ): string {
    return [
      prefix,
      metric,
      userId,
      Buffer.from(this.stableSerialize(query)).toString("base64url"),
    ].join(":");
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private formatCacheSegment(
    value: string | number | undefined,
    fallback = "all",
  ): string {
    return String(value ?? fallback);
  }

  private formatLevelCacheSegment(query: {
    minLevel?: number;
    maxLevel?: number;
  }): string {
    return `${this.formatCacheSegment(query.minLevel, "any")}-${this.formatCacheSegment(query.maxLevel, "any")}`;
  }

  private formatBooleanCacheSegment(
    enabled: boolean | undefined,
    enabledSegment: string,
  ): string {
    return enabled ? enabledSegment : "all";
  }

  private buildAnalyticsWhere(
    battlesRef: typeof battles,
    params: {
      userId: string;
      world?: string;
      startDate?: Date;
      matchmaking?: boolean;
      characterIds: string[];
      phFilter?: boolean;
      hasFlee?: boolean;
      ratingNotNull?: boolean;
      ratingDeltaNotNull?: boolean;
    },
  ): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      eq(battlesRef.userId, params.userId),
      eq(battlesRef.type, "1v1"),
      ...(params.world ? [eq(battlesRef.world, params.world)] : []),
      ...(params.startDate ? [gt(battlesRef.createdAt, params.startDate)] : []),
      ...(params.matchmaking !== undefined
        ? [eq(battlesRef.matchmaking, params.matchmaking)]
        : []),
      ...(params.hasFlee !== undefined
        ? [eq(battlesRef.hasFlee, params.hasFlee)]
        : []),
      ...(params.ratingNotNull ? [isNotNull(battlesRef.rating)] : []),
      ...(params.ratingDeltaNotNull ? [isNotNull(battlesRef.ratingDelta)] : []),
    ];

    const warriorConditions: (SQL | undefined)[] = [
      inArray(battleWarriors.originalId, params.characterIds),
      ...(params.phFilter ? [gt(battleWarriors.ph, 0)] : []),
    ];

    conditions.push(this.warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  }

  private buildCombatProfileWhere(
    battlesRef: typeof battles,
    params: {
      userId: string;
      world?: string;
      startDate?: Date;
      matchmaking?: boolean;
      characterIds: string[];
      phFilter?: boolean;
    },
  ): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      eq(battlesRef.userId, params.userId),
      ...(params.world ? [eq(battlesRef.world, params.world)] : []),
      ...(params.startDate ? [gt(battlesRef.createdAt, params.startDate)] : []),
      ...(params.matchmaking !== undefined
        ? [eq(battlesRef.matchmaking, params.matchmaking)]
        : []),
    ];

    const warriorConditions: (SQL | undefined)[] = [
      inArray(battleWarriors.originalId, params.characterIds),
      ...(params.phFilter ? [gt(battleWarriors.ph, 0)] : []),
    ];

    conditions.push(this.warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  }

  private calculateCombatProfile(
    fetchedBattles: InflatedBattleWithWarriors[],
    characterIds: string[],
  ): CombatProfileDto {
    const damageMix = new Map<string, number>();
    const mitigationMix = new Map<string, number>();
    const spellUsage = new Map<
      string,
      { spell: string; skillId: number | null; casts: number }
    >();
    const matchupByProfession = new Map<
      string,
      { wins: number; losses: number }
    >();
    const highlights = new Map<
      string,
      {
        battleId: string;
        createdAt: string;
        type: string;
        label: string;
        value: number;
      }
    >();

    let totalBattles = 0;
    let wins = 0;
    let losses = 0;
    let totalPH = 0;
    let totalRatingDelta = 0;
    let totalTurns = 0;
    let totalDuration = 0;
    let totalDamage = 0;
    let totalDamageTaken = 0;
    let totalBlockedDamage = 0;
    let totalControlTaken = 0;
    let cumulativePh = 0;
    let cumulativeRatingDelta = 0;

    const phTrend: CombatProfileDto["phTrend"] = [];
    const ratingTrend: CombatProfileDto["ratingTrend"] = [];

    for (const battle of fetchedBattles) {
      const userWarrior = battle.warriors.find((warrior) =>
        characterIds.includes(warrior.originalId),
      );
      if (!userWarrior || battle.hasFlee) {
        continue;
      }

      const isWin = userWarrior.team === battle.winningTeam;
      const isLoss = userWarrior.team === battle.losingTeam;
      if (!isWin && !isLoss) {
        continue;
      }

      totalBattles++;
      if (isWin) {
        wins++;
      } else {
        losses++;
      }

      const damage = userWarrior.damageDealtAfterDefensive;
      const damageTaken = userWarrior.damageTaken;
      const blockedDamage = userWarrior.blockedDamage;

      totalPH += userWarrior.ph;
      totalRatingDelta += battle.ratingDelta ?? 0;
      totalTurns += userWarrior.turns;
      totalDuration += battle.duration;
      totalDamage += damage;
      totalDamageTaken += damageTaken;
      totalBlockedDamage += blockedDamage;
      totalControlTaken += userWarrior.turnsLost;

      this.addBreakdownValue(damageMix, "melee", userWarrior.meleeDamage);
      this.addBreakdownValue(damageMix, "distance", userWarrior.distanceDamage);
      this.addBreakdownValue(
        damageMix,
        "auxiliary",
        userWarrior.auxiliaryDamage,
      );
      this.addBreakdownValue(damageMix, "fire", userWarrior.fireDamage);
      this.addBreakdownValue(damageMix, "frost", userWarrior.frostDamage);
      this.addBreakdownValue(
        damageMix,
        "lightning",
        userWarrior.lightningDamage,
      );
      this.addBreakdownValue(damageMix, "third", userWarrior.thirdAttDamage);
      this.addBreakdownValue(damageMix, "true", userWarrior.trueDamageDealt);
      this.addBreakdownValue(damageMix, "rage", userWarrior.rageDamageDealt);
      this.addBreakdownValue(
        damageMix,
        "stigma",
        userWarrior.stigmaDamageDealt,
      );

      this.addBreakdownValue(mitigationMix, "blockedDamage", blockedDamage);
      this.addBreakdownValue(mitigationMix, "blocks", userWarrior.blocks);
      this.addBreakdownValue(mitigationMix, "evasions", userWarrior.evasions);

      const spellsUsedMap = userWarrior.spellsUsedMap as Record<string, number>;
      for (const [spell, casts] of Object.entries(spellsUsedMap)) {
        const skillId = Number.parseInt(spell, 10);
        const normalizedSkillId = Number.isNaN(skillId) ? null : skillId;
        const current = spellUsage.get(spell) ?? {
          spell,
          skillId: normalizedSkillId,
          casts: 0,
        };
        current.casts += casts;
        spellUsage.set(spell, current);
      }

      const opponents = battle.warriors.filter(
        (warrior) => warrior.team !== userWarrior.team,
      );
      for (const opponent of opponents) {
        const stats = matchupByProfession.get(opponent.prof) ?? {
          wins: 0,
          losses: 0,
        };
        if (isWin) {
          stats.wins++;
        } else {
          stats.losses++;
        }
        matchupByProfession.set(opponent.prof, stats);
      }

      cumulativePh += userWarrior.ph;
      phTrend.push({
        date: battle.createdAt.toISOString(),
        value: userWarrior.ph,
        cumulativeValue: cumulativePh,
        battleId: battle.id,
      });

      const ratingDelta = battle.ratingDelta ?? 0;
      cumulativeRatingDelta += ratingDelta;
      ratingTrend.push({
        date: battle.createdAt.toISOString(),
        value: ratingDelta,
        cumulativeValue: cumulativeRatingDelta,
        battleId: battle.id,
      });

      this.setHighlight(highlights, "biggestDamage", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestDamage",
        label: "biggestDamage",
        value: damage,
      });
      this.setHighlight(highlights, "biggestMitigation", {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        type: "biggestMitigation",
        label: "biggestMitigation",
        value: blockedDamage,
      });
      if (isWin) {
        this.setHighlight(highlights, "biggestComeback", {
          battleId: battle.id,
          createdAt: battle.createdAt.toISOString(),
          type: "biggestComeback",
          label: "biggestComeback",
          value: damageTaken,
        });
      }
    }

    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
    const avgTurns = totalBattles > 0 ? totalTurns / totalBattles : 0;
    const avgDuration = totalBattles > 0 ? totalDuration / totalBattles : 0;
    const damagePerTurn = totalTurns > 0 ? totalDamage / totalTurns : 0;
    const mitigationBase = totalDamageTaken + totalBlockedDamage;
    const mitigationRate =
      mitigationBase > 0 ? (totalBlockedDamage / mitigationBase) * 100 : 0;
    const controlRate =
      totalTurns > 0 ? (totalControlTaken / totalTurns) * 100 : 0;

    const totalSpellCasts = Array.from(spellUsage.values()).reduce(
      (sum, spell) => sum + spell.casts,
      0,
    );

    return {
      summary: {
        totalBattles,
        wins,
        losses,
        winRate: this.roundMetric(winRate),
        totalPH,
        totalRatingDelta,
        avgTurns: this.roundMetric(avgTurns),
        avgDuration: Math.round(avgDuration),
        damagePerTurn: this.roundMetric(damagePerTurn),
        mitigationRate: this.roundMetric(mitigationRate),
        controlRate: this.roundMetric(controlRate),
      },
      damageMix: this.getBreakdownEntries(damageMix),
      mitigationMix: this.getBreakdownEntries(mitigationMix),
      spellUsage: Array.from(spellUsage.values())
        .map((spell) => ({
          ...spell,
          share:
            totalSpellCasts > 0
              ? this.roundMetric((spell.casts / totalSpellCasts) * 100)
              : 0,
        }))
        .sort((a, b) => b.casts - a.casts)
        .slice(0, 12),
      matchupByProfession: Array.from(matchupByProfession.entries())
        .map(([prof, stats]) => {
          const professionTotalBattles = stats.wins + stats.losses;
          return {
            prof,
            wins: stats.wins,
            losses: stats.losses,
            totalBattles: professionTotalBattles,
            winRate:
              professionTotalBattles > 0
                ? this.roundMetric((stats.wins / professionTotalBattles) * 100)
                : 0,
          };
        })
        .sort((a, b) => b.totalBattles - a.totalBattles),
      phTrend,
      ratingTrend,
      highlights: Array.from(highlights.values())
        .filter((highlight) => highlight.value > 0)
        .sort((a, b) => b.value - a.value),
    };
  }

  private getEmptyCombatProfile(): CombatProfileDto {
    return {
      summary: {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPH: 0,
        totalRatingDelta: 0,
        avgTurns: 0,
        avgDuration: 0,
        damagePerTurn: 0,
        mitigationRate: 0,
        controlRate: 0,
      },
      damageMix: [],
      mitigationMix: [],
      spellUsage: [],
      matchupByProfession: [],
      phTrend: [],
      ratingTrend: [],
      highlights: [],
    };
  }

  private addBreakdownValue(
    accumulator: Map<string, number>,
    key: string,
    value: number,
  ): void {
    if (value <= 0) {
      return;
    }

    accumulator.set(key, (accumulator.get(key) ?? 0) + value);
  }

  private getBreakdownEntries(
    accumulator: Map<string, number>,
  ): CombatProfileDto["damageMix"] {
    const total = Array.from(accumulator.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    return Array.from(accumulator.entries())
      .map(([key, value]) => ({
        key,
        label: key,
        value,
        share: total > 0 ? this.roundMetric((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }

  private setHighlight(
    highlights: Map<
      string,
      {
        battleId: string;
        createdAt: string;
        type: string;
        label: string;
        value: number;
      }
    >,
    key: string,
    value: {
      battleId: string;
      createdAt: string;
      type: string;
      label: string;
      value: number;
    },
  ): void {
    const current = highlights.get(key);
    if (!current || value.value > current.value) {
      highlights.set(key, value);
    }
  }

  private roundMetric(value: number): number {
    return Math.round(value * 100) / 100;
  }

  async getRatingGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<RatingGrowthDataPointDto[]> {
    const cacheKey = this.buildStatisticsCacheKey(
      "rating-growth",
      userId,
      query,
      { includeBattleFilters: false },
    );

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: true,
            characterIds,
            ratingNotNull: true,
            ratingDeltaNotNull: true,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "asc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const result: RatingGrowthDataPointDto[] = filteredBattles.map((battle) => {
      return {
        date: battle.createdAt.toISOString(),
        ratingDelta: battle.ratingDelta ?? 0,
        rating: battle.rating ?? 0,
        battleId: battle.id,
      };
    });

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async getRatingDeltaByOpponent(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<RatingDeltaByOpponentDto[]> {
    const cacheKey = this.buildStatisticsCacheKey(
      "rating-delta-by-opponent",
      userId,
      query,
      { includeBattleFilters: false },
    );

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: true,
            characterIds,
            hasFlee: false,
            ratingDeltaNotNull: true,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "desc" },
    });

    let filteredBattles = this.inflateBattleRows(fetchedBattles);
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = filteredBattles.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const opponentStats = new Map<
      string,
      {
        name: string;
        icon: string;
        prof: string;
        lvl: number;
        totalRatingDelta: number;
        wins: number;
        losses: number;
        lastBattleDate: Date;
        battlesWithRating: number;
      }
    >();

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => !characterIds.includes(w.originalId),
      );

      if (userWarrior && opponentWarrior && battle.ratingDelta !== null) {
        const opponentId = opponentWarrior.originalId;
        const stats = opponentStats.get(opponentId) ?? {
          name: opponentWarrior.name,
          icon: opponentWarrior.icon,
          prof: opponentWarrior.prof,
          lvl: opponentWarrior.lvl,
          totalRatingDelta: 0,
          wins: 0,
          losses: 0,
          lastBattleDate: battle.createdAt,
          battlesWithRating: 0,
        };

        stats.totalRatingDelta += battle.ratingDelta;
        if (battle.ratingDelta !== 0) {
          stats.battlesWithRating++;
        }

        if (userWarrior.team === battle.winningTeam) {
          stats.wins++;
        } else if (userWarrior.team === battle.losingTeam) {
          stats.losses++;
        }

        if (battle.createdAt > stats.lastBattleDate) {
          stats.lastBattleDate = battle.createdAt;
        }

        opponentStats.set(opponentId, stats);
      }
    }

    const result = Array.from(opponentStats.entries())
      .map(([opponentId, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        return {
          opponentId,
          opponentName: stats.name,
          opponentIcon: stats.icon,
          opponentProf: stats.prof,
          opponentLvl: stats.lvl,
          totalRatingDelta: stats.totalRatingDelta,
          wins: stats.wins,
          losses: stats.losses,
          totalBattles,
          avgRatingDelta:
            stats.battlesWithRating > 0
              ? Math.round(
                  (stats.totalRatingDelta / stats.battlesWithRating) * 100,
                ) / 100
              : 0,
          lastBattleDate: stats.lastBattleDate.toISOString(),
        };
      })
      .sort((a, b) => b.totalRatingDelta - a.totalRatingDelta);

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.ANALYTICS_CACHE_TTL,
    );

    return result;
  }

  async getPlayerVsPlayerBattles(
    query: QueryPlayerVsPlayerDto,
    userId: string,
  ): Promise<PlayerVsPlayerPaginatedResponse> {
    return this.getCachedAnalyticsResult(
      this.buildQueryCacheKey("statistics", "player-vs-player", userId, query),
      () => this.getPlayerVsPlayerBattlesUncached(query, userId),
    );
  }

  private async getPlayerVsPlayerBattlesUncached(
    query: QueryPlayerVsPlayerDto,
    userId: string,
  ): Promise<PlayerVsPlayerPaginatedResponse> {
    const startTime = Date.now();

    const characterIds = await this.getCharacterIds(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (characterIds.length === 0) {
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

    const startDate = this.getDateFilter(query.period);

    const fetchedBattles = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) =>
          this.buildAnalyticsWhere(table, {
            userId,
            world: query.world,
            startDate,
            matchmaking: query.matchmaking,
            characterIds,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "desc" },
    });

    const filteredByOpponent = this.inflateBattleRows(fetchedBattles).filter(
      (battle) => {
        if (battle.type !== "1v1") {
          return false;
        }

        if (query.excludeBattleId && battle.id === query.excludeBattleId) {
          return false;
        }

        const hasOpponent = battle.warriors.some(
          (w) => w.originalId === query.opponentId,
        );
        return hasOpponent;
      },
    );

    let levelFilteredBattles = filteredByOpponent;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      levelFilteredBattles = filteredByOpponent.filter((battle) =>
        this.isOpponentLevelInRange(
          battle,
          characterIds,
          query.minLevel,
          query.maxLevel,
        ),
      );
    }

    const totalRecords = levelFilteredBattles.length;

    let startIndex = 0;
    if (query.cursor) {
      try {
        const decodedCursor = Buffer.from(query.cursor, "base64").toString(
          "utf-8",
        );
        const cursorIndex = Number.parseInt(decodedCursor, 10);
        if (!Number.isNaN(cursorIndex) && cursorIndex >= 0) {
          startIndex = cursorIndex;
        }
      } catch {
        startIndex = 0;
      }
    }

    const size = query.size ?? 20;
    const endIndex = startIndex + size;
    const paginatedBattles = levelFilteredBattles.slice(startIndex, endIndex);

    const resultBattles = paginatedBattles.map((battle) => {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      const opponentWarrior = battle.warriors.find(
        (w) => w.originalId === query.opponentId,
      );

      return {
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        duration: battle.duration,
        winner: battle.winner,
        loser: battle.loser,
        ratingDelta: battle.ratingDelta ?? 0,
        userRating: battle.rating ?? 0,
        opponentRating: battle.opponentRating ?? 0,
        userWarrior: {
          name: userWarrior?.name ?? "",
          lvl: userWarrior?.lvl ?? 0,
          prof: userWarrior?.prof ?? "",
          icon: userWarrior?.icon ?? "",
        },
        opponentWarrior: {
          name: opponentWarrior?.name ?? "",
          lvl: opponentWarrior?.lvl ?? 0,
          prof: opponentWarrior?.prof ?? "",
          icon: opponentWarrior?.icon ?? "",
        },
      };
    });

    const hasNext = endIndex < totalRecords;
    const hasPrev = startIndex > 0;
    const nextCursor = hasNext
      ? Buffer.from(endIndex.toString()).toString("base64")
      : undefined;
    const previousCursor = hasPrev
      ? Buffer.from(Math.max(0, startIndex - size).toString()).toString(
          "base64",
        )
      : undefined;

    const queryTime = Date.now() - startTime;

    return {
      battles: resultBattles,
      pagination: {
        size,
        hasNext,
        hasPrev,
        nextCursor,
        previousCursor,
        ...(query.includeTotal && { total: totalRecords }),
      },
      meta: {
        performance: {
          queryTime,
          ...(query.includeTotal && { totalItems: totalRecords }),
        },
      },
    };
  }

  private isOpponentLevelInRange(
    battle: InflatedBattleWithWarriors,
    characterIds: string[],
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    if (battle.type !== "1v1") return false;

    const opponentWarrior = battle.warriors.find(
      (warrior) => !characterIds.includes(warrior.originalId),
    );

    if (!opponentWarrior) return false;

    const opponentLevel = opponentWarrior.lvl;

    if (minLevel !== undefined && opponentLevel < minLevel) {
      return false;
    }

    return maxLevel === undefined || opponentLevel <= maxLevel;
  }

  private isAnyOpponentLevelInRange(
    battle: InflatedBattleWithWarriors,
    characterIds: string[],
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    const opponents = battle.warriors.filter(
      (warrior) => !characterIds.includes(warrior.originalId),
    );

    return opponents.some((opponent) => {
      if (minLevel !== undefined && opponent.lvl < minLevel) {
        return false;
      }

      return maxLevel === undefined || opponent.lvl <= maxLevel;
    });
  }
}
