import { and, count, gt, lt, or, eq, sql, type SQL } from "drizzle-orm";
import { logger } from "../config/winston.config.js";
import { DrizzleDatabase } from "../shared/drizzle/drizzle-database.js";
import { battles } from "../shared/drizzle/schema.js";
import type {
  CursorPagination,
  PaginationOptions,
  PaginationResult,
} from "./types/pagination.types.js";

type WhereBuilder = (table: typeof battles) => SQL | undefined;

interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export class BattlePagination {
  private readonly loggerWithContext = logger.child({
    context: BattlePagination.name,
  });

  constructor(private readonly drizzle: DrizzleDatabase) {}

  private encodeCursor(createdAt: Date, id: string): string {
    return `${createdAt.toISOString()}_${id}`;
  }

  private decodeCursor(cursor: string): DecodedCursor | null {
    const separatorIndex = cursor.indexOf("_");
    if (separatorIndex === -1) {
      return null;
    }
    const timestamp = cursor.substring(0, separatorIndex);
    const id = cursor.substring(separatorIndex + 1);
    const createdAt = new Date(timestamp);
    if (isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  }

  async paginateBattles(
    whereBuilder: WhereBuilder,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const startTime = Date.now();
    const { size = 20, cursor, includeTotal } = options;

    const order = options.sortOrder === "asc" ? "asc" : "desc";

    const results = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) => {
          const base = whereBuilder(table);
          return (
            this.buildCursorWhere(table, base, cursor, options) ?? sql`true`
          );
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
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
    }

    let total: number | undefined;
    const countStartTime = Date.now();
    if (includeTotal) {
      total = await this.getEstimatedCount(whereBuilder(battles));
    }
    const countTime = Date.now() - countStartTime;

    const pagination: CursorPagination = {
      size,
      hasNext,
      hasPrev: !!cursor,
      nextCursor,
      total,
    };

    const queryTime = Date.now() - startTime;

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
  }

  private buildCursorWhere(
    table: typeof battles,
    where: SQL | undefined,
    cursor: string | undefined,
    options: PaginationOptions,
  ): SQL | undefined {
    if (!cursor) {
      return where;
    }

    const decoded = this.decodeCursor(cursor);
    if (!decoded) {
      this.loggerWithContext.warn("Invalid cursor format", { cursor });
      return where;
    }

    const { createdAt, id } = decoded;
    const cmp = options.sortOrder === "desc" ? lt : gt;
    const cursorCondition = or(
      cmp(table.createdAt, createdAt),
      and(eq(table.createdAt, createdAt), cmp(table.id, id)),
    )!;

    return where ? and(where, cursorCondition) : cursorCondition;
  }

  private async getEstimatedCount(where: SQL | undefined): Promise<number> {
    try {
      if (!where) {
        const result = await this.drizzle.db.execute(sql`
          SELECT reltuples::BIGINT AS estimated_count
          FROM pg_class
          WHERE relname = 'battles'
        `);
        const row = result.rows[0] as { estimated_count: string } | undefined;
        return Number(row?.estimated_count || 0);
      }

      const result = await this.drizzle.db
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    } catch (error) {
      this.loggerWithContext.warn("Failed to get estimated count, falling back", {
        error,
      });
      const result = await this.drizzle.db
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    }
  }
}
