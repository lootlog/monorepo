import { Injectable } from "@nestjs/common";
import type {
  BattleAnalyticsDto,
  BattleDurationStatsDto,
  PhGrowthDataPointDto,
  ProfessionWinRateDto,
  RatingDeltaByOpponentDto,
  RatingGrowthDataPointDto,
  StreakDto,
} from "src/battles/dto/battle-statistics-response.dto";
import { BattleAnalyticsDomainService } from "src/battles/services/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "src/battles/services/battle-analytics.types";

@Injectable()
export class BattleSummaryCalculatorService {
  constructor(private readonly domainService: BattleAnalyticsDomainService) {}

  calculateBattleAnalytics(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): BattleAnalyticsDto {
    let wins = 0;
    let losses = 0;
    let totalPH = 0;

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );

      if (!userWarrior) {
        continue;
      }

      totalPH += userWarrior.ph;

      if (battle.hasFlee) {
        continue;
      }

      if (userWarrior.team === battle.winningTeam) {
        wins++;
      } else if (userWarrior.team === battle.losingTeam) {
        losses++;
      }
    }

    const totalBattles = wins + losses;
    const winRatio = totalBattles > 0 ? wins / totalBattles : 0;

    return {
      totalBattles,
      wins,
      losses,
      winRatio: Math.round(winRatio * 10000) / 100,
      totalPH,
    };
  }

  calculateProfessionWinRate(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): ProfessionWinRateDto[] {
    const professionStats = new Map<string, { wins: number; losses: number }>();

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );
      const opponentWarrior = this.domainService.findOpponentWarrior(
        battle,
        characterIds,
      );

      if (!userWarrior || !opponentWarrior) {
        continue;
      }

      const stats = professionStats.get(opponentWarrior.prof) ?? {
        wins: 0,
        losses: 0,
      };

      if (userWarrior.team === battle.winningTeam) {
        stats.wins++;
      } else if (userWarrior.team === battle.losingTeam) {
        stats.losses++;
      }

      professionStats.set(opponentWarrior.prof, stats);
    }

    return Array.from(professionStats.entries())
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
      .sort((left, right) => right.totalBattles - left.totalBattles);
  }

  calculateCurrentStreak(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): StreakDto {
    if (battles.length === 0) {
      return this.getEmptyStreak();
    }

    let currentStreak = 0;
    let currentType: "wins" | "losses" | "none" = "none";
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;
    let isCurrentStreakActive = true;

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );
      if (!userWarrior) {
        continue;
      }

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
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
        tempLossStreak = 0;
      } else {
        tempLossStreak++;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
        tempWinStreak = 0;
      }
    }

    return {
      current: { type: currentType, count: currentStreak },
      longest: { wins: longestWinStreak, losses: longestLossStreak },
    };
  }

  calculateBattleDurationStats(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): BattleDurationStatsDto {
    if (battles.length === 0) {
      return this.getEmptyDurationStats();
    }

    let totalWinDuration = 0;
    let totalLossDuration = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );
      if (!userWarrior) {
        continue;
      }

      if (userWarrior.team === battle.winningTeam) {
        totalWinDuration += battle.duration;
        winCount++;
      } else {
        totalLossDuration += battle.duration;
        lossCount++;
      }
    }

    const fastestBattle = battles[0];
    const longestBattle = battles.at(-1);

    return {
      avgWinDuration:
        winCount > 0 ? Math.round(totalWinDuration / winCount) : 0,
      avgLossDuration:
        lossCount > 0 ? Math.round(totalLossDuration / lossCount) : 0,
      fastest: fastestBattle
        ? { duration: fastestBattle.duration, battleId: fastestBattle.id }
        : null,
      longest: longestBattle
        ? { duration: longestBattle.duration, battleId: longestBattle.id }
        : null,
    };
  }

  calculatePhGrowthTimeSeries(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): PhGrowthDataPointDto[] {
    let cumulativePh = 0;

    return battles.map((battle) => {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
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
  }

  calculateRatingGrowthTimeSeries(
    battles: InflatedBattleWithWarriors[],
  ): RatingGrowthDataPointDto[] {
    return battles.map((battle) => ({
      date: battle.createdAt.toISOString(),
      ratingDelta: battle.ratingDelta ?? 0,
      rating: battle.rating ?? 0,
      battleId: battle.id,
    }));
  }

  calculateRatingDeltaByOpponent(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): RatingDeltaByOpponentDto[] {
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

    for (const battle of battles) {
      const userWarrior = this.domainService.findUserWarrior(
        battle,
        characterIds,
      );
      const opponentWarrior = this.domainService.findOpponentWarrior(
        battle,
        characterIds,
      );

      if (!userWarrior || !opponentWarrior || battle.ratingDelta === null) {
        continue;
      }

      const stats = opponentStats.get(opponentWarrior.originalId) ?? {
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

      opponentStats.set(opponentWarrior.originalId, stats);
    }

    return Array.from(opponentStats.entries())
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
      .sort((left, right) => right.totalRatingDelta - left.totalRatingDelta);
  }

  getEmptyStreak(): StreakDto {
    return {
      current: { type: "none", count: 0 },
      longest: { wins: 0, losses: 0 },
    };
  }

  getEmptyDurationStats(): BattleDurationStatsDto {
    return {
      avgWinDuration: 0,
      avgLossDuration: 0,
      fastest: null,
      longest: null,
    };
  }
}
