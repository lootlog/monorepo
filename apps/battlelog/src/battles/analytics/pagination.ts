import { Schema } from "effect";
import type { DeepMutable } from "#src/battles/battle-response-types";
import type { SortOrder } from "#src/battles/catalog/query-battles";

export const CursorPaginationSchema = Schema.Struct({
  size: Schema.Number,
  hasNext: Schema.Boolean,
  hasPrev: Schema.Boolean,
  nextCursor: Schema.optional(Schema.String),
  previousCursor: Schema.optional(Schema.String),
  total: Schema.optional(Schema.Number),
});

export type CursorPagination = DeepMutable<typeof CursorPaginationSchema.Type>;

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
