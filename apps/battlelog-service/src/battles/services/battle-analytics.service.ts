import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import type { QueryBattleAnalyticsDto } from 'src/battles/dto/query-battle-analytics.dto';
import type { QueryBattleStatisticsDto } from 'src/battles/dto/query-battle-statistics.dto';
import type {
  ProfessionWinRateDto,
  HeadToHeadRecordDto,
  HeadToHeadPaginatedResponseDto,
  StreakDto,
  BattleDurationStatsDto,
  PhGrowthDataPointDto,
} from 'src/battles/dto/battle-statistics-response.dto';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { RedisService } from 'src/shared/modules/redis/redis.service';

@Injectable()
export class BattleAnalyticsService {
  private readonly logger = new Logger(BattleAnalyticsService.name);
  private readonly ANALYTICS_CACHE_PREFIX = 'analytics';
  private readonly ANALYTICS_CACHE_TTL = 5 * 60;

  constructor(
    private readonly prisma: PrismaService,
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
    const cacheKey = `${this.ANALYTICS_CACHE_PREFIX}:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}:${query.sameLevelOnly ? 'samelevel' : 'all'}`;

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Analytics cache hit for user ${userId}`);
      return JSON.parse(cachedResult);
    }

    let characterIds: string[] = [];

    if (query.characterId) {
      const userCharacter = await this.prisma.userCharacter.findFirst({
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
      const userCharacters = await this.prisma.userCharacter.findMany({
        where: {
          userId,
          ...(query.world && { world: query.world }),
        },
        select: { characterId: true },
      });

      characterIds = userCharacters.map((c) => c.characterId);
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

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
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

    this.logger.log(
      `Analytics for user ${userId}: ${totalBattles} battles, ${wins} wins, ${losses} losses, ${totalPH} PH (cached)`,
    );

    return result;
  }

  async calculateProfessionWinRate(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<ProfessionWinRateDto[]> {
    const cacheKey = `statistics:profession-win-rate:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}:${query.sameLevelOnly ? 'samelevel' : 'all'}`;

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Profession win rate cache hit for user ${userId}`);
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      hasFlee: false,
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
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

    this.logger.log(
      `Profession win rate calculated for user ${userId} (cached)`,
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

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      hasFlee: false,
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
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
        };

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

    let allRecords = Array.from(opponentStats.entries()).map(
      ([opponentId, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        return {
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
        };
      },
    );

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      allRecords = allRecords.filter((record) =>
        record.opponentName.toLowerCase().includes(searchLower),
      );
    }

    if (query.minBattles) {
      allRecords = allRecords.filter(
        (record) => record.totalBattles >= query.minBattles!,
      );
    }

    const sortBy = query.sortBy || 'totalBattles';
    const sortOrder = query.sortOrder || 'desc';
    allRecords.sort((a, b) => {
      let compareResult = 0;

      switch (sortBy) {
        case 'wins':
          compareResult = a.wins - b.wins;
          break;
        case 'losses':
          compareResult = a.losses - b.losses;
          break;
        case 'totalBattles':
          compareResult = a.totalBattles - b.totalBattles;
          break;
        case 'winRate':
          compareResult = a.winRate - b.winRate;
          break;
        case 'lastBattleDate':
          compareResult =
            new Date(a.lastBattleDate).getTime() -
            new Date(b.lastBattleDate).getTime();
          break;
      }

      return sortOrder === 'desc' ? -compareResult : compareResult;
    });

    const totalRecords = allRecords.length;

    let startIndex = 0;
    if (query.cursor) {
      try {
        const decodedCursor = Buffer.from(query.cursor, 'base64').toString(
          'utf-8',
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
    const paginatedRecords = allRecords.slice(startIndex, endIndex);

    const hasNext = endIndex < totalRecords;
    const hasPrev = startIndex > 0;
    const nextCursor = hasNext
      ? Buffer.from(endIndex.toString()).toString('base64')
      : undefined;

    const queryTime = Date.now() - startTime;

    this.logger.log(
      `Head-to-head paginated for user ${userId}: ${paginatedRecords.length} records, ${queryTime}ms`,
    );

    return {
      records: paginatedRecords,
      pagination: {
        size,
        hasNext,
        hasPrev,
        nextCursor,
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
    const cacheKey = `statistics:streak:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}:${query.sameLevelOnly ? 'samelevel' : 'all'}`;

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Streak cache hit for user ${userId}`);
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return {
        current: { type: 'none', count: 0 },
        longest: { wins: 0, losses: 0 },
      };
    }

    const startDate = this.getDateFilter(query.period);

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      hasFlee: false,
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
      );
    }

    if (filteredBattles.length === 0) {
      return {
        current: { type: 'none', count: 0 },
        longest: { wins: 0, losses: 0 },
      };
    }

    let currentStreak = 0;
    let currentType: 'wins' | 'losses' | 'none' = 'none';
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (const battle of filteredBattles) {
      const userWarrior = battle.warriors.find((w) =>
        characterIds.includes(w.originalId),
      );
      if (!userWarrior) continue;

      const isWin = userWarrior.team === battle.winningTeam;

      if (currentType === 'none') {
        currentType = isWin ? 'wins' : 'losses';
        currentStreak = 1;
      } else if (
        (currentType === 'wins' && isWin) ||
        (currentType === 'losses' && !isWin)
      ) {
        currentStreak++;
      } else {
        break;
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

    this.logger.log(`Streak calculated for user ${userId} (cached)`);

    return result;
  }

  async getBattleDurationStats(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<BattleDurationStatsDto> {
    const cacheKey = `statistics:duration:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}:${query.sameLevelOnly ? 'samelevel' : 'all'}`;

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Duration stats cache hit for user ${userId}`);
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

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      hasFlee: false,
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
      orderBy: {
        duration: 'asc',
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
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

    this.logger.log(`Duration stats calculated for user ${userId} (cached)`);

    return result;
  }

  async getPhGrowthTimeSeries(
    query: QueryBattleStatisticsDto,
    userId: string,
  ): Promise<PhGrowthDataPointDto[]> {
    const cacheKey = `statistics:ph-growth:${userId}:${query.characterId || 'all'}:${query.world || 'all'}:${query.period || 'all'}:${query.sameLevelOnly ? 'samelevel' : 'all'}`;

    const cachedResult = await this.redisService.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`PH growth cache hit for user ${userId}`);
      return JSON.parse(cachedResult);
    }

    const characterIds = await this.getCharacterIds(userId, query);

    if (characterIds.length === 0) {
      return [];
    }

    const startDate = this.getDateFilter(query.period);

    const where: Prisma.BattleWhereInput = {
      userId,
      type: '1v1',
      ...(query.world && { world: query.world }),
      ...(startDate && { createdAt: { gte: startDate } }),
      warriors: {
        some: {
          originalId: { in: characterIds },
          ph: { gt: 0 },
        },
      },
    };

    const battles = await this.prisma.battle.findMany({
      where,
      include: {
        warriors: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let filteredBattles = battles;
    if (query.sameLevelOnly) {
      filteredBattles = battles.filter((battle) =>
        this.isSameLevelBattle(battle, characterIds),
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

    this.logger.log(
      `PH growth time series calculated for user ${userId} (cached)`,
    );

    return result;
  }

  async invalidateAnalyticsCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `${this.ANALYTICS_CACHE_PREFIX}:${userId}:*`,
        `statistics:*:${userId}:*`,
      ];

      const redis = await this.redisService.getClient();

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          this.logger.debug(
            `Invalidated ${keys.length} cache entries for pattern ${pattern}`,
          );
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
      const userCharacter = await this.prisma.userCharacter.findFirst({
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

    const userCharacters = await this.prisma.userCharacter.findMany({
      where: {
        userId,
        ...(query.world && { world: query.world }),
      },
      select: { characterId: true },
    });

    return userCharacters.map((c) => c.characterId);
  }

  private getDateFilter(period?: string): Date | undefined {
    if (!period || period === 'all') return undefined;

    const now = new Date();
    const periodMap: Record<string, number> = {
      '24h': 1,
      '3d': 3,
      '7d': 7,
      '14d': 14,
      '30d': 30,
      '90d': 90,
      '180d': 180,
    };

    const days = periodMap[period];
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private isSameLevelBattle(battle: any, characterIds: string[]): boolean {
    if (battle.type !== '1v1') return false;

    const userWarrior = battle.warriors.find((w: any) =>
      characterIds.includes(w.originalId),
    );
    const opponentWarrior = battle.warriors.find(
      (w: any) => !characterIds.includes(w.originalId),
    );

    if (!userWarrior || !opponentWarrior) return false;

    const levelDiff = opponentWarrior.lvl - userWarrior.lvl;

    if (userWarrior.team === 1) {
      return levelDiff <= 10;
    }

    if (userWarrior.team === 2) {
      return levelDiff <= 2;
    }

    return false;
  }
}
