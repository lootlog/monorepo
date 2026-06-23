import { Injectable, Logger } from "@nestjs/common";
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
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { battles } from "src/shared/modules/drizzle/schema";
import type { StoredBattleWithWarriors } from "./battle-analytics.types";
import type {
  CursorPagination,
  PaginationOptions,
  PaginationResult,
} from "../interfaces/pagination.interface";

type WhereBuilder = (table: typeof battles) => SQL | undefined;

interface DecodedCursor {
  createdAt: Date;
  id: string;
}

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  constructor(private readonly drizzle: DrizzleService) {}

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
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  }

  async paginateBattles(
    whereBuilder: WhereBuilder,
    options: PaginationOptions,
  ): Promise<PaginationResult<StoredBattleWithWarriors>> {
    const startTime = Date.now();
    const { size = 20, cursor, includeTotal } = options;
    const decodedCursor = this.decodeOptionalCursor(cursor);

    const order = options.sortOrder === "asc" ? "asc" : "desc";

    const results = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) => {
          const base = whereBuilder(table);
          return this.buildCursorWhere(table, base, decodedCursor, options);
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
    const previousCursor = await this.getPreviousCursor(
      whereBuilder,
      decodedCursor,
      options,
    );

    let total: number | undefined;
    const countStartTime = Date.now();
    if (includeTotal) {
      total = await this.getEstimatedCount(whereBuilder(battles));
    }
    const countTime = Date.now() - countStartTime;

    const pagination: CursorPagination = {
      size,
      hasNext,
      hasPrev: decodedCursor !== null,
      nextCursor,
      previousCursor,
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
    decoded: DecodedCursor | null,
    options: PaginationOptions,
  ): SQL | undefined {
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
  }

  private async getPreviousCursor(
    whereBuilder: WhereBuilder,
    decoded: DecodedCursor | null,
    options: PaginationOptions,
  ): Promise<string | undefined> {
    if (!decoded) {
      return undefined;
    }

    const size = options.size ?? 20;
    const reverseOrder = options.sortOrder === "asc" ? "desc" : "asc";
    const previousWindow = await this.drizzle.db.query.battles.findMany({
      where: {
        RAW: (table: typeof battles) => {
          const base = whereBuilder(table);
          return this.buildPreviousCursorWhere(table, base, decoded, options);
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

    return this.encodeCursor(previousBoundary.createdAt, previousBoundary.id);
  }

  private buildPreviousCursorWhere(
    table: typeof battles,
    where: SQL | undefined,
    decoded: DecodedCursor,
    options: PaginationOptions,
  ): SQL | undefined {
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
  }

  private decodeOptionalCursor(
    cursor: string | undefined,
  ): DecodedCursor | null {
    if (!cursor) {
      return null;
    }

    const decoded = this.decodeCursor(cursor);
    if (!decoded) {
      this.logger.warn(`Invalid cursor format: ${cursor}`);
    }
    return decoded;
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
        return Number(row?.estimated_count ?? 0);
      }

      const result = await this.drizzle.db
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    } catch (error) {
      this.logger.warn("Failed to get estimated count, falling back", error);
      const result = await this.drizzle.db
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    }
  }
}
