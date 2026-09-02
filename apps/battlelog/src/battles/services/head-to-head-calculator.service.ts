import type { QueryBattleStatisticsDto } from "#src/battles/dto/query-battle-statistics.dto";
import type { HeadToHeadRecordDto } from "#src/battles/dto/battle-statistics-response.dto";
import { BattleAnalyticsDomainService } from "#src/battles/services/battle-analytics-domain.service";
import type {
  BattleResult,
  InflatedBattleWithWarriors,
} from "#src/battles/services/battle-analytics.types";

type HeadToHeadSortBy = NonNullable<QueryBattleStatisticsDto["sortBy"]>;

export class HeadToHeadCalculatorService {
  constructor(private readonly domainService: BattleAnalyticsDomainService) {}

  calculateRecords(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    query: QueryBattleStatisticsDto,
  ): HeadToHeadRecordDto[] {
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
        lastBattleResult: BattleResult;
        lastBattleUserWarrior: InflatedBattleWithWarriors["warriors"][number];
        lastBattleOpponentWarrior: InflatedBattleWithWarriors["warriors"][number];
        totalRatingDelta: number;
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

      if (!userWarrior || !opponentWarrior) {
        continue;
      }

      const battleResult = this.domainService.getBattleResultForUserWarrior(
        battle,
        userWarrior,
      );
      const existingStats = opponentStats.get(opponentWarrior.originalId);
      const stats = existingStats ?? {
        name: opponentWarrior.name,
        icon: opponentWarrior.icon,
        prof: opponentWarrior.prof,
        lvl: opponentWarrior.lvl,
        wins: 0,
        losses: 0,
        lastBattleDate: battle.createdAt,
        lastBattleResult: battleResult,
        lastBattleUserWarrior: userWarrior,
        lastBattleOpponentWarrior: opponentWarrior,
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

      if (!existingStats || battle.createdAt > stats.lastBattleDate) {
        stats.name = opponentWarrior.name;
        stats.icon = opponentWarrior.icon;
        stats.prof = opponentWarrior.prof;
        stats.lvl = opponentWarrior.lvl;
        stats.lastBattleDate = battle.createdAt;
        stats.lastBattleResult = battleResult;
        stats.lastBattleUserWarrior = userWarrior;
        stats.lastBattleOpponentWarrior = opponentWarrior;
      }

      opponentStats.set(opponentWarrior.originalId, stats);
    }

    const records = Array.from(opponentStats.entries()).map(
      ([opponentId, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        const ratingStats = this.getRatingStats(stats, query.matchmaking);

        return {
          opponentId,
          opponentName: stats.name,
          opponentIcon: stats.icon,
          opponentProf: stats.prof,
          opponentLvl: stats.lvl,
          lastBattleResult: stats.lastBattleResult,
          lastBattleUserWarrior: this.domainService.mapPlayerVsPlayerWarrior(
            stats.lastBattleUserWarrior,
          ),
          lastBattleOpponentWarrior:
            this.domainService.mapPlayerVsPlayerWarrior(
              stats.lastBattleOpponentWarrior,
            ),
          wins: stats.wins,
          losses: stats.losses,
          totalBattles,
          winRate: totalBattles > 0 ? (stats.wins / totalBattles) * 100 : 0,
          lastBattleDate: stats.lastBattleDate.toISOString(),
          totalRatingDelta: ratingStats.totalRatingDelta,
          avgRatingDelta: ratingStats.avgRatingDelta,
        };
      },
    );

    return this.sortRecords(
      this.applyRecordFilters(records, query),
      query.sortBy ?? "totalBattles",
      query.sortOrder ?? "desc",
    );
  }

  private getRatingStats(
    stats: {
      totalRatingDelta: number;
      battlesWithRating: number;
    },
    matchmaking: boolean | undefined,
  ) {
    if (!matchmaking) {
      return {
        totalRatingDelta: undefined,
        avgRatingDelta: undefined,
      };
    }

    if (stats.battlesWithRating === 0) {
      return {
        totalRatingDelta: stats.totalRatingDelta,
        avgRatingDelta: 0,
      };
    }

    return {
      totalRatingDelta: stats.totalRatingDelta,
      avgRatingDelta:
        Math.round((stats.totalRatingDelta / stats.battlesWithRating) * 100) /
        100,
    };
  }

  private applyRecordFilters(
    records: HeadToHeadRecordDto[],
    query: QueryBattleStatisticsDto,
  ): HeadToHeadRecordDto[] {
    let filteredRecords = records;

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

    return filteredRecords;
  }

  private sortRecords(
    records: HeadToHeadRecordDto[],
    sortBy: HeadToHeadSortBy,
    sortOrder: "asc" | "desc",
  ): HeadToHeadRecordDto[] {
    records.sort((left, right) => {
      let compareResult = 0;

      switch (sortBy) {
        case "wins":
          compareResult = left.wins - right.wins;
          break;
        case "losses":
          compareResult = left.losses - right.losses;
          break;
        case "totalBattles":
          compareResult = left.totalBattles - right.totalBattles;
          break;
        case "winRate":
          compareResult = left.winRate - right.winRate;
          break;
        case "lastBattleDate":
          compareResult =
            new Date(left.lastBattleDate).getTime() -
            new Date(right.lastBattleDate).getTime();
          break;
        case "totalRatingDelta":
          compareResult =
            (left.totalRatingDelta ?? 0) - (right.totalRatingDelta ?? 0);
          break;
        case "avgRatingDelta":
          compareResult =
            (left.avgRatingDelta ?? 0) - (right.avgRatingDelta ?? 0);
          break;
      }

      return sortOrder === "desc" ? -compareResult : compareResult;
    });

    return records;
  }
}
