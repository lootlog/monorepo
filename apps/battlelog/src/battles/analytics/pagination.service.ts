import { Logger } from "#src/infrastructure/logger";
import { Clock, Effect } from "effect";
import {
  and,
  count,
  gt,
  gte,
  lt,
  lte,
  or,
  eq,
  sql,
  type SQL,
} from "drizzle-orm";
import type { DrizzleDatabase } from "#src/database/database";
import { battles } from "#src/database/schema";
import type {
  CursorPagination,
  PaginationOptions,
} from "#src/battles/analytics/pagination";

type WhereBuilder = (table: typeof battles) => SQL | undefined;

interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export const makeBattlePagination = (drizzle: DrizzleDatabase) => {
  const logger = new Logger("BattlePagination");

  const encodeCursor = (createdAt: Date, id: string): string =>
    `${createdAt.toISOString()}_${id}`;

  const decodeCursor = (cursor: string): DecodedCursor | null => {
    const separatorIndex = cursor.indexOf("_");
    if (separatorIndex === -1) {
      return null;
    }
    const timestamp = cursor.substring(0, separatorIndex);
    const id = cursor.substring(separatorIndex + 1);
    const createdAt = new Date(timestamp);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  };

  const paginateBattles = (
    whereBuilder: WhereBuilder,
    options: PaginationOptions,
  ) =>
    Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;
      const { size = 20, cursor, includeTotal } = options;
      const decodedCursor = decodeOptionalCursor(cursor);

      const order = options.sortOrder === "asc" ? "asc" : "desc";

      const results = yield* drizzle.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) => {
            const base = whereBuilder(table);
            return buildCursorWhere(table, base, decodedCursor, options);
          },
        },
        limit: size + 1,
        with: { warriors: true },
        orderBy: { createdAt: order, id: order },
      });

      const hasNext = results.length > size;
      const items = hasNext ? results.slice(0, size) : results;

      let nextCursor: string | undefined;
      if (hasNext && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = encodeCursor(lastItem.createdAt, lastItem.id);
      }
      const previousCursor = yield* getPreviousCursor(
        whereBuilder,
        decodedCursor,
        options,
      );

      let total: number | undefined;
      const countStartTime = yield* Clock.currentTimeMillis;
      if (includeTotal) {
        total = yield* getEstimatedCount(whereBuilder(battles));
      }
      const countFinishedAt = yield* Clock.currentTimeMillis;
      const countTime = countFinishedAt - countStartTime;

      const pagination: CursorPagination = {
        size,
        hasNext,
        hasPrev: decodedCursor !== null,
        nextCursor,
        previousCursor,
        total,
      };

      const queryFinishedAt = yield* Clock.currentTimeMillis;
      const queryTime = queryFinishedAt - startTime;

      return {
        data: items,
        pagination,
        performance: {
          queryTime,
          countTime: includeTotal ? countTime : undefined,
          totalItems: total,
          estimatedTotal: !!total,
        },
      };
    }).pipe(
      Effect.withSpan("BattlePagination_paginate", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
    );

  const buildCursorWhere = (
    table: typeof battles,
    where: SQL | undefined,
    decoded: DecodedCursor | null,
    options: PaginationOptions,
  ): SQL | undefined => {
    if (!decoded) {
      return where;
    }

    const { createdAt, id } = decoded;
    const cmp = options.sortOrder === "desc" ? lt : gt;
    const cursorCondition = or(
      cmp(table.createdAt, createdAt),
      and(eq(table.createdAt, createdAt), cmp(table.id, id)),
    )!;

    return where ? and(where, cursorCondition) : cursorCondition;
  };

  const getPreviousCursor = (
    whereBuilder: WhereBuilder,
    decoded: DecodedCursor | null,
    options: PaginationOptions,
  ) =>
    Effect.gen(function* () {
      if (!decoded) {
        return undefined;
      }

      const size = options.size ?? 20;
      const reverseOrder = options.sortOrder === "asc" ? "desc" : "asc";
      const previousWindow = yield* drizzle.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) => {
            const base = whereBuilder(table);
            return buildPreviousCursorWhere(table, base, decoded, options);
          },
        },
        limit: size + 1,
        orderBy: { createdAt: reverseOrder, id: reverseOrder },
      });

      if (previousWindow.length <= size) {
        return undefined;
      }

      const previousBoundary = previousWindow[size];
      if (!previousBoundary) {
        return undefined;
      }

      return encodeCursor(previousBoundary.createdAt, previousBoundary.id);
    });

  const buildPreviousCursorWhere = (
    table: typeof battles,
    where: SQL | undefined,
    decoded: DecodedCursor,
    options: PaginationOptions,
  ): SQL | undefined => {
    const { createdAt, id } = decoded;
    const createdAtComparator = options.sortOrder === "desc" ? gt : lt;
    const idComparator = options.sortOrder === "desc" ? gte : lte;
    const previousCursorCondition = or(
      createdAtComparator(table.createdAt, createdAt),
      and(eq(table.createdAt, createdAt), idComparator(table.id, id)),
    )!;

    return where
      ? and(where, previousCursorCondition)
      : previousCursorCondition;
  };

  const decodeOptionalCursor = (
    cursor: string | undefined,
  ): DecodedCursor | null => {
    if (!cursor) {
      return null;
    }

    const decoded = decodeCursor(cursor);
    if (!decoded) {
      logger.warn(`Invalid cursor format: ${cursor}`);
    }
    return decoded;
  };

  const getEstimatedCount = (where: SQL | undefined) =>
    Effect.gen(function* () {
      if (!where) {
        const result = yield* drizzle.execute<{ estimated_count: string }>(sql`
            SELECT reltuples::BIGINT AS estimated_count
            FROM pg_class
            WHERE relname = 'battles'
          `);
        const row = result[0];
        return Number(row?.estimated_count ?? 0);
      }

      const result = yield* drizzle
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    }).pipe(
      Effect.catch((error) => {
        logger.warn("Failed to get estimated count, falling back", error);
        return drizzle
          .select({ count: count() })
          .from(battles)
          .where(where)
          .pipe(Effect.map((result) => result[0]?.count ?? 0));
      }),
    );

  return { paginateBattles };
};

export type BattlePagination = ReturnType<typeof makeBattlePagination>;
