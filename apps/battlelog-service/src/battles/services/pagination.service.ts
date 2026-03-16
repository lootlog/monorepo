import { Injectable, Logger } from "@nestjs/common";
import { and, count, gt, lt, sql, type SQL } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { battles } from "src/shared/modules/drizzle/schema";
import { SortOrder } from "../dto/query-battles.dto";
import type {
  CursorPagination,
  PaginationOptions,
  PaginationResult,
} from "../interfaces/pagination.interface";

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async paginateBattles(
    where: SQL | undefined,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const startTime = Date.now();
    const { size = 20, cursor, includeTotal } = options;

    const cursorWhere = this.buildCursorWhere(where, cursor, options);
    const order = options.sortOrder === SortOrder.ASC ? "asc" : "desc";

    const results = await this.drizzle.db.query.battles.findMany({
      where: cursorWhere ? { RAW: () => cursorWhere } : undefined,
      limit: size + 1,
      with: { warriors: true },
      orderBy: { id: order },
    });

    const hasNext = results.length > size;
    const items = hasNext ? results.slice(0, size) : results;

    let nextCursor: string | undefined;
    if (hasNext && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = lastItem.id;
    }

    let total: number | undefined;
    const countStartTime = Date.now();
    if (includeTotal) {
      total = await this.getEstimatedCount(where);
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
    where: SQL | undefined,
    cursor: string | undefined,
    options: PaginationOptions,
  ): SQL | undefined {
    if (!cursor) {
      return where;
    }

    const cursorCondition =
      options.sortOrder === SortOrder.DESC
        ? lt(battles.id, cursor)
        : gt(battles.id, cursor);

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
      this.logger.warn("Failed to get estimated count, falling back", error);
      const result = await this.drizzle.db
        .select({ count: count() })
        .from(battles)
        .where(where);
      return result[0]?.count ?? 0;
    }
  }
}
