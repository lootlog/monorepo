import type { SortOrder } from "#src/battles/catalog/query-battles";

export interface CursorPagination {
  size: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  previousCursor?: string;
  total?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: CursorPagination;
  performance: {
    queryTime: number;
    countTime?: number;
    totalItems?: number;
    estimatedTotal?: boolean;
  };
}

export interface PaginationOptions {
  sortOrder: SortOrder;
  includeTotal: boolean;
  cursor?: string;
  size?: number;
}
