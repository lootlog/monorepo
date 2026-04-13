import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, eq, gt, inArray, isNotNull, type SQL } from "drizzle-orm";
import type { QueryBattleAnalyticsDto } from "src/battles/dto/query-battle-analytics.dto";
import type { QueryBattleStatisticsDto } from "src/battles/dto/query-battle-statistics.dto";
import type {
  ProfessionWinRateDto,
  HeadToHeadPaginatedResponseDto,
  StreakDto,
  BattleDurationStatsDto,
  PhGrowthDataPointDto,
  RatingGrowthDataPointDto,
  RatingDeltaByOpponentDto,
  PlayerVsPlayerPaginatedResponseDto,
} from "src/battles/dto/battle-statistics-response.dto";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  battleWarriors,
  type battles,
} from "src/shared/modules/drizzle/schema";
import { RedisService } from "@lootlog/nest-shared";
import { warriorExists } from "../utils/warrior-exists";

@Injectable()
export class BattleAnalyticsService {
  private readonly logger = new Logger(BattleAnalyticsService.name);
  private readonly ANALYTICS_CACHE_PREFIX = "analytics";
  private readonly ANALYTICS_CACHE_TTL = 5 * 60;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redisService: RedisService,
  ) {}

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
    const levelFilter = `${query.minLevel ?? "any"}-${query.maxLevel ?? "any"}`;
    const phFilter = query.ph ? "ph" : "all";
    const matchmakingFilter = query.matchmaking ? "matchmaking" : "all";
    const cacheKey = `${this.ANALYTICS_CACHE_PREFIX}:${userId}:${query.characterId ?? "all"}:${query.world ?? "all"}:${query.period ?? "all"}:${levelFilter}:${phFilter}:${matchmakingFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const phFilter = query.ph ? "ph" : "all";
    const matchmakingFilter = query.matchmaking ? "matchmaking" : "all";
    const cacheKey = `statistics:profession-win-rate:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}:${phFilter}:${matchmakingFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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

  async getHeadToHead(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<HeadToHeadPaginatedResponseDto> {
    const startTime = Date.now();

    const characterIds = await this.getCharacterIds(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (characterIds.length === 0) {
      return {
        records: [],
        pagination: {
          size: query.size || 20,
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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
        const stats = opponentStats.get(opponentId) || {
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

    const size = query.size || 20;
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
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const phFilter = query.ph ? "ph" : "all";
    const matchmakingFilter = query.matchmaking ? "matchmaking" : "all";
    const cacheKey = `statistics:streak:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}:${phFilter}:${matchmakingFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const phFilter = query.ph ? "ph" : "all";
    const matchmakingFilter = query.matchmaking ? "matchmaking" : "all";
    const cacheKey = `statistics:duration:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}:${phFilter}:${matchmakingFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const phFilter = query.ph ? "ph" : "all";
    const matchmakingFilter = query.matchmaking ? "matchmaking" : "all";
    const cacheKey = `statistics:ph-growth:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}:${phFilter}:${matchmakingFilter}`;

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
            warriorExists(
              this.drizzle,
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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
      ];

      const redis = this.redisService.getClient();

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
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

    conditions.push(
      warriorExists(this.drizzle, battlesRef, ...warriorConditions),
    );

    return and(...conditions);
  }

  async getRatingGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<RatingGrowthDataPointDto[]> {
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const cacheKey = `statistics:rating-growth:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
    const levelFilter = `${query.minLevel || "any"}-${query.maxLevel || "any"}`;
    const cacheKey = `statistics:rating-delta-by-opponent:${userId}:${query.characterId || "all"}:${query.world || "all"}:${query.period || "all"}:${levelFilter}`;

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

    let filteredBattles = fetchedBattles;
    if (query.minLevel !== undefined || query.maxLevel !== undefined) {
      filteredBattles = fetchedBattles.filter((battle) =>
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
        const stats = opponentStats.get(opponentId) || {
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
    query: QueryBattleStatisticsDto & { opponentId: string },
    userId: string,
  ): Promise<PlayerVsPlayerPaginatedResponseDto> {
    const startTime = Date.now();

    const characterIds = await this.getCharacterIds(userId, {
      characterId: query.characterId,
      world: query.world,
    });

    if (characterIds.length === 0) {
      return {
        battles: [],
        pagination: {
          size: query.size || 20,
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
            matchmaking: true,
            characterIds,
          }),
      },
      with: { warriors: true },
      orderBy: { createdAt: "desc" },
    });

    const filteredByOpponent = fetchedBattles.filter((battle) => {
      const hasOpponent = battle.warriors.some(
        (w) => w.originalId === query.opponentId,
      );
      return hasOpponent;
    });

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

    const size = query.size || 20;
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
    battle: any,
    characterIds: string[],
    minLevel?: number,
    maxLevel?: number,
  ): boolean {
    if (battle.type !== "1v1") return false;

    const opponentWarrior = battle.warriors.find(
      (w: any) => !characterIds.includes(w.originalId),
    );

    if (!opponentWarrior) return false;

    const opponentLevel = opponentWarrior.lvl;

    if (minLevel !== undefined && opponentLevel < minLevel) {
      return false;
    }

    return maxLevel === undefined || opponentLevel <= maxLevel;
  }
}
