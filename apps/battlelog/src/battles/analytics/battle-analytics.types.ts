import type { CursorPagination } from "./pagination.js";

export type DateRangeQuery = {
  period?: string;
  startDate?: string;
  endDate?: string;
};

export type AnalyticsDateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type InMemoryPaginationOptions = {
  cursor?: string;
  includeTotal?: boolean;
  size?: number;
};

export type InMemoryPaginationResult<TRecord> = {
  records: TRecord[];
  pagination: CursorPagination;
  totalRecords: number;
};
