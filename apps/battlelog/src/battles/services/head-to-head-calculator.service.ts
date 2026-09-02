import type { QueryBattleStatisticsDto } from "#src/battles/dto/query-battle-statistics.dto";
import type { HeadToHeadRecordDto } from "#src/battles/dto/battle-statistics-response.dto";
import type { BattleAnalyticsDomain } from "#src/battles/services/battle-analytics-domain.service";
import type {
  BattleResult,
  InflatedBattleWithWarriors,
} from "#src/battles/services/battle-analytics.types";

type HeadToHeadSortBy = NonNullable<QueryBattleStatisticsDto["sortBy"]>;
type Warrior = InflatedBattleWithWarriors["warriors"][number];
type OpponentStats = {
  name: string;
  icon: string;
  prof: string;
  lvl: number;
  wins: number;
  losses: number;
  lastBattleDate: Date;
  lastBattleResult: BattleResult;
  lastBattleUserWarrior: Warrior;
  lastBattleOpponentWarrior: Warrior;
  totalRatingDelta: number;
  battlesWithRating: number;
};

const ratingStats = (
  stats: Pick<OpponentStats, "totalRatingDelta" | "battlesWithRating">,
  matchmaking: boolean | undefined,
) => {
  if (!matchmaking) {
    return { totalRatingDelta: undefined, avgRatingDelta: undefined };
  }
  return {
    totalRatingDelta: stats.totalRatingDelta,
    avgRatingDelta:
      stats.battlesWithRating === 0
        ? 0
        : Math.round((stats.totalRatingDelta / stats.battlesWithRating) * 100) /
          100,
  };
};

const applyRecordFilters = (
  records: HeadToHeadRecordDto[],
  query: QueryBattleStatisticsDto,
): HeadToHeadRecordDto[] => {
  let filteredRecords = records;
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filteredRecords = filteredRecords.filter((record) =>
      record.opponentName.toLowerCase().includes(searchLower),
    );
  }
  const minBattles = query.minBattles;
  if (minBattles !== undefined) {
    filteredRecords = filteredRecords.filter(
      (record) => record.totalBattles >= minBattles,
    );
  }
  return filteredRecords;
};

const sortRecords = (
  records: HeadToHeadRecordDto[],
  sortBy: HeadToHeadSortBy,
  sortOrder: "asc" | "desc",
): HeadToHeadRecordDto[] => {
  records.sort((left, right) => {
    let comparison: number;
    switch (sortBy) {
      case "wins":
        comparison = left.wins - right.wins;
        break;
      case "losses":
        comparison = left.losses - right.losses;
        break;
      case "totalBattles":
        comparison = left.totalBattles - right.totalBattles;
        break;
      case "winRate":
        comparison = left.winRate - right.winRate;
        break;
      case "lastBattleDate":
        comparison =
          new Date(left.lastBattleDate).getTime() -
          new Date(right.lastBattleDate).getTime();
        break;
      case "totalRatingDelta":
        comparison =
          (left.totalRatingDelta ?? 0) - (right.totalRatingDelta ?? 0);
        break;
      case "avgRatingDelta":
        comparison = (left.avgRatingDelta ?? 0) - (right.avgRatingDelta ?? 0);
        break;
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });
  return records;
};

export const makeHeadToHeadCalculator = (domain: BattleAnalyticsDomain) => ({
  calculateRecords(
    battles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
    query: QueryBattleStatisticsDto,
  ): HeadToHeadRecordDto[] {
    const opponents = new Map<string, OpponentStats>();

    for (const battle of battles) {
      const userWarrior = domain.findUserWarrior(battle, characterIds);
      const opponentWarrior = domain.findOpponentWarrior(battle, characterIds);
      if (!userWarrior || !opponentWarrior) continue;

      const battleResult = domain.getBattleResultForUserWarrior(
        battle,
        userWarrior,
      );
      const existing = opponents.get(opponentWarrior.originalId);
      const stats = existing ?? {
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

      if (userWarrior.team === battle.winningTeam) stats.wins++;
      else if (userWarrior.team === battle.losingTeam) stats.losses++;

      if (query.matchmaking && battle.ratingDelta !== null) {
        stats.totalRatingDelta += battle.ratingDelta;
        if (battle.ratingDelta !== 0) stats.battlesWithRating++;
      }

      if (!existing || battle.createdAt > stats.lastBattleDate) {
        Object.assign(stats, {
          name: opponentWarrior.name,
          icon: opponentWarrior.icon,
          prof: opponentWarrior.prof,
          lvl: opponentWarrior.lvl,
          lastBattleDate: battle.createdAt,
          lastBattleResult: battleResult,
          lastBattleUserWarrior: userWarrior,
          lastBattleOpponentWarrior: opponentWarrior,
        });
      }
      opponents.set(opponentWarrior.originalId, stats);
    }

    const records = Array.from(opponents.entries()).map(
      ([opponentId, stats]) => {
        const totalBattles = stats.wins + stats.losses;
        const rating = ratingStats(stats, query.matchmaking);
        return {
          opponentId,
          opponentName: stats.name,
          opponentIcon: stats.icon,
          opponentProf: stats.prof,
          opponentLvl: stats.lvl,
          lastBattleResult: stats.lastBattleResult,
          lastBattleUserWarrior: domain.mapPlayerVsPlayerWarrior(
            stats.lastBattleUserWarrior,
          ),
          lastBattleOpponentWarrior: domain.mapPlayerVsPlayerWarrior(
            stats.lastBattleOpponentWarrior,
          ),
          wins: stats.wins,
          losses: stats.losses,
          totalBattles,
          winRate: totalBattles > 0 ? (stats.wins / totalBattles) * 100 : 0,
          lastBattleDate: stats.lastBattleDate.toISOString(),
          totalRatingDelta: rating.totalRatingDelta,
          avgRatingDelta: rating.avgRatingDelta,
        };
      },
    );

    return sortRecords(
      applyRecordFilters(records, query),
      query.sortBy ?? "totalBattles",
      query.sortOrder ?? "desc",
    );
  },
});

export type HeadToHeadCalculator = ReturnType<typeof makeHeadToHeadCalculator>;
