import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/shared/modules/prisma/prisma.service";
import { SortOrder } from "../dto/query-battles.dto";
import type {
  CursorPagination,
  PaginationOptions,
  PaginationResult,
} from "../interfaces/pagination.interface";

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async paginateBattles(
    where: any,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const startTime = Date.now();
    const { size = 20, cursor, includeTotal } = options;

    const cursorWhere = this.buildCursorWhere(where, cursor, options);
    const battles = await this.prisma.battle.findMany({
      where: cursorWhere,
      take: size + 1,
      include: { warriors: true },
      orderBy: this.buildOrderBy(options.sortOrder),
    });

    const hasNext = battles.length > size;
    const items = hasNext ? battles.slice(0, size) : battles;

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
    where: any,
    cursor: string | undefined,
    options: PaginationOptions,
  ): any {
    if (!cursor) {
      return where;
    }

    const operator = options.sortOrder === SortOrder.DESC ? "lt" : "gt";

    return {
      ...where,
      id: {
        [operator]: cursor,
      },
    };
  }

  private buildOrderBy(sortOrder: SortOrder): any {
    const order = sortOrder === SortOrder.ASC ? "asc" : "desc";
    return { id: order };
  }

  private async getEstimatedCount(where: any): Promise<number> {
    try {
      if (Object.keys(where).length === 0) {
        const result = await this.prisma.$queryRaw<
          [{ estimated_count: bigint }]
        >`
          SELECT reltuples::BIGINT AS estimated_count
          FROM pg_class
          WHERE relname = 'battles';
        `;
        return Number(result[0]?.estimated_count || 0);
      }

      return await this.prisma.battle.count({ where });
    } catch (error) {
      this.logger.warn("Failed to get estimated count, falling back", error);
      return this.prisma.battle.count({ where });
    }
  }
}
