import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { Clock, Effect } from "effect";
import { and, count, gt, lt, sql, type SQL } from "drizzle-orm";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { DrizzleDatabase } from "#src/database/database";
import { battles } from "#src/database/schema";
import { isBattleId } from "#src/battles/battle-id";
import { InvalidRequestError } from "@lootlog/protocol/http/errors";
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

    const validateCursor =
      cursor && !decodedCursor
        ? Effect.fail(new InvalidRequestError("Invalid pagination cursor"))
        : Effect.void;

    const readPage = Effect.gen(function* () {
      const startTime = yield* Clock.currentTimeMillis;

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
            ) ?? sql`true`,
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
        ...(hasNext && last && { nextCursor: encodeCursor("next", last.id) }),
        ...(hasPrev &&
          first && { previousCursor: encodeCursor("previous", first.id) }),
        ...(total !== undefined && { total }),
      };

      const queryFinishedAt = yield* Clock.currentTimeMillis;
      const queryTime = queryFinishedAt - startTime;

      return {
        data: items,
        pagination,
        performance: {
          queryTime,
          ...(includeTotal && { countTime }),
          ...(total !== undefined && { totalItems: total }),
          estimatedTotal: !!total,
        },
      };
    }).pipe(read);

    return validateCursor.pipe(
      Effect.andThen(readPage),
      withAdapterSpan("BattlePagination_paginate", "drizzle"),
    );
  };

  const getEstimatedCount = (where: SQL | undefined) =>
    Effect.gen(function* () {
      if (!where) {
        const [row] = yield* drizzle.execute<{ estimated_count: string }>(
          sql`
            SELECT reltuples::BIGINT AS estimated_count
            FROM pg_class
            WHERE relname = 'battles'
          `,
          "objects",
        );

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
