import type { SortOrder } from "../dto/query-battles.dto";

export interface CursorPagination {
  size: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
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
