import type { CursorPagination } from "./pagination.js";

export type DateRangeQuery = {
  period?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export type AnalyticsDateRange = {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
};

export type InMemoryPaginationOptions = {
  cursor?: string | undefined;
  includeTotal?: boolean | undefined;
  size?: number | undefined;
};

export type InMemoryPaginationResult<TRecord> = {
  records: TRecord[];
  pagination: CursorPagination;
  totalRecords: number;
};
