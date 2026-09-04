import type { InflatedBattleWarrior } from "#src/battles/statistics/battle-warrior-stats";
import type { Battle, BattleWarrior } from "#src/database/schema";

export type StoredBattleWithWarriors = Omit<Battle, "statistics"> & {
  warriors: BattleWarrior[];
};

export type InflatedBattleWithWarriors = Omit<Battle, "statistics"> & {
  warriors: InflatedBattleWarrior[];
};

export type BattleResult = "flee" | "lost" | "won";

export type DateRangeQuery = {
  period?: string;
  startDate?: string;
  endDate?: string;
};

export type AnalyticsDateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type AnalyticsBattleOrderBy = Partial<
  Record<"createdAt" | "duration", "asc" | "desc">
>;

export type InMemoryPaginationOptions = {
  cursor?: string;
  includeTotal?: boolean;
  size?: number;
};

export type InMemoryPaginationResult<TRecord> = {
  records: TRecord[];
  pagination: {
    size: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    previousCursor?: string;
    total?: number;
  };
  totalRecords: number;
};
