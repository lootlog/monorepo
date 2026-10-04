import { Clock, Effect } from "effect";
import { and, count, gt, lt, sql, type SQL } from "drizzle-orm";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { DrizzleDatabase } from "#src/database/database";
import { battles } from "#src/database/schema";
import { isBattleId } from "#src/battles/battle-id";
import { InvalidRequestError } from "#src/infrastructure/http-error";
import type {
  CursorPagination,
  PaginationOptions,
} from "#src/battles/analytics/pagination";

type WhereBuilder = (table: typeof battles) => SQL | undefined;

type CursorDirection = "next" | "previous";

interface DecodedCursor {
  direction: CursorDirection;
  id: string;
}

type BattlePaginationDatabase = Pick<DrizzleDatabase, "select" | "execute"> & {
  query: { battles: Pick<DrizzleDatabase["query"]["battles"], "findMany"> };
};

const CURSOR_PREFIXES = { next: "n", previous: "p" } as const;

// The cursor is opaque to clients: a direction and the battle ID that bounds
// the page, exclusive.
const encodeCursor = (direction: CursorDirection, id: string): string =>
  Buffer.from(`${CURSOR_PREFIXES[direction]}:${id}`).toString("base64url");

const decodeCursor = (cursor: string): DecodedCursor | null => {
  const [prefix, id, ...rest] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split(":");

  if (rest.length > 0 || !id || !isBattleId(id)) return null;

  if (prefix === CURSOR_PREFIXES.next) return { direction: "next", id };

  if (prefix === CURSOR_PREFIXES.previous) return { direction: "previous", id };

  return null;
};

export const makeBattlePagination = (
  drizzle: BattlePaginationDatabase,
  read: BattleReadBudget,
) => {
  const paginateBattles = (
    whereBuilder: WhereBuilder,
    options: PaginationOptions,
  ) => {
    const { size = 20, cursor, includeTotal } = options;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    if (cursor && !decodedCursor) {
      return Effect.fail(new InvalidRequestError("Invalid pagination cursor"));
    }

    return Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;

      // A previous page reads towards the start of the list from its cursor,
      // then restores the list order. One extra row reports whether more
      // battles lie in the direction read.
      const backward = decodedCursor?.direction === "previous";
      const descending = (options.sortOrder !== "asc") !== backward;
      const order = descending ? "desc" : "asc";

      const rows = yield* drizzle.query.battles.findMany({
        where: {
          RAW: (table: typeof battles) =>
            and(
              whereBuilder(table),
              decodedCursor
                ? (descending ? lt : gt)(table.id, decodedCursor.id)
                : undefined,
            ),
        },
        limit: size + 1,
        with: { warriors: true },
        orderBy: { id: order },
      });

      const hasMore = rows.length > size;
      const items = rows.slice(0, size);

      if (backward) items.reverse();

      const hasNext = backward || hasMore;
      const hasPrev = backward ? hasMore : decodedCursor !== null;
      const first = items[0];
      const last = items[items.length - 1];

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
        hasPrev,
        nextCursor: hasNext && last ? encodeCursor("next", last.id) : undefined,
        previousCursor:
          hasPrev && first ? encodeCursor("previous", first.id) : undefined,
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
      read,
      Effect.withSpan("BattlePagination_paginate", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
    );
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
    });

  return { paginateBattles };
};

export type BattlePagination = ReturnType<typeof makeBattlePagination>;
