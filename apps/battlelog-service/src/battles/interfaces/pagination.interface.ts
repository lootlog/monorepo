import { PaginationStrategy, SortField, SortOrder } from '../dto/query-battles.dto';

export interface CursorData {
  id: string;
  createdAt: Date;
  [key: string]: any;
}

export interface PaginationCursor {
  data: CursorData;
  hasMore: boolean;
}

export interface OffsetPagination {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPagination {
  size: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
  total?: number; // Optional for performance
}

export interface PaginationResult<T> {
  data: T[];
  pagination: OffsetPagination | CursorPagination;
  strategy: PaginationStrategy;
  performance: {
    queryTime: number;
    countTime?: number;
    totalItems?: number;
    estimatedTotal?: boolean;
  };
}

export interface PaginationOptions {
  strategy: PaginationStrategy;
  sortField: SortField;
  sortOrder: SortOrder;
  includeTotal: boolean;
  estimateTotal: boolean;

  // For offset pagination
  page?: number;
  limit?: number;

  // For cursor pagination
  cursor?: string;
  size?: number;
}