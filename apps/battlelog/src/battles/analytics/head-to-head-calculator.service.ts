import type { BattleStatisticsQuery } from "#src/battles/analytics/query-battle-statistics";
import type { HeadToHeadRecord } from "#src/battles/analytics/battle-statistics-response";

type HeadToHeadSortBy = NonNullable<BattleStatisticsQuery["sortBy"]>;

const applyRecordFilters = (
  records: HeadToHeadRecord[],
  query: BattleStatisticsQuery,
): HeadToHeadRecord[] => {
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
  records: HeadToHeadRecord[],
  sortBy: HeadToHeadSortBy,
  sortOrder: "asc" | "desc",
): HeadToHeadRecord[] => {
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

export const filterAndSortHeadToHeadRecords = (
  records: HeadToHeadRecord[],
  query: BattleStatisticsQuery,
) =>
  sortRecords(
    applyRecordFilters(records, query),
    query.sortBy ?? "totalBattles",
    query.sortOrder ?? "desc",
  );
