import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import {
  PaginationStrategy,
  SortOrder,
  type SortField,
} from '../dto/query-battles.dto';
import type {
  CursorPagination,
  OffsetPagination,
  PaginationOptions,
  PaginationResult,
} from '../interfaces/pagination.interface';

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);
  private readonly LARGE_DATASET_THRESHOLD = 10000;
  private readonly ESTIMATED_COUNT_THRESHOLD = 100000;

  constructor(private readonly prisma: PrismaService) {}

  async paginateBattles(
    where: any,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const startTime = Date.now();

    const strategy = await this.determinePaginationStrategy(where, options);

    let result: PaginationResult<any>;

    if (strategy === PaginationStrategy.CURSOR) {
      result = await this.executeCursorPagination(where, options);
    } else {
      result = await this.executeOffsetPagination(where, options);
    }

    result.performance.queryTime = Date.now() - startTime;
    result.strategy = strategy;

    return result;
  }

  private async determinePaginationStrategy(
    where: any,
    options: PaginationOptions,
  ): Promise<PaginationStrategy> {
    if (options.strategy !== PaginationStrategy.AUTO) {
      return options.strategy;
    }

    if (
      options.cursor ||
      (options.page && options.limit && options.page > 50)
    ) {
      return PaginationStrategy.CURSOR;
    }

    return PaginationStrategy.OFFSET;
  }

  private async executeOffsetPagination(
    where: any,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const { page = 1, limit = 20, includeTotal, estimateTotal } = options;
    const skip = (page - 1) * limit;

    const countStartTime = Date.now();
    let total: number | undefined;
    let estimatedTotal = false;

    if (includeTotal) {
      if (estimateTotal) {
        total = await this.getEstimatedCount(where);
        estimatedTotal = true;
      } else {
        total = await this.prisma.battle.count({ where });
      }
    }

    const countTime = Date.now() - countStartTime;

    const battles = await this.prisma.battle.findMany({
      where,
      skip,
      take: limit,
      include: {
        warriors: true,
      },
      orderBy: this.buildOrderBy(options.sortField, options.sortOrder),
    });

    const pagination: OffsetPagination = {
      page,
      limit,
      total,
      totalPages: total ? Math.ceil(total / limit) : undefined,
      hasNext: battles.length === limit && (!total || skip + limit < total),
      hasPrev: page > 1,
    };

    return {
      data: battles,
      pagination,
      strategy: PaginationStrategy.OFFSET,
      performance: {
        queryTime: 0, // Will be set by caller
        countTime: includeTotal ? countTime : undefined,
        totalItems: total,
        estimatedTotal,
      },
    };
  }

  private async executeCursorPagination(
    where: any,
    options: PaginationOptions,
  ): Promise<PaginationResult<any>> {
    const { size = 20, cursor, includeTotal, estimateTotal } = options;

    let cursorData: any = null;
    if (cursor) {
      try {
        cursorData = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf-8'),
        );
      } catch {
        this.logger.warn(`Invalid cursor: ${cursor}`);
      }
    }

    const cursorWhere = this.buildCursorWhere(where, cursorData, options);
    const battles = await this.prisma.battle.findMany({
      where: cursorWhere,
      take: size + 1,
      include: { warriors: true },
      orderBy: this.buildOrderBy(options.sortField, options.sortOrder),
    });

    const hasNext = battles.length > size;
    const items = hasNext ? battles.slice(0, size) : battles;

    let nextCursor: string | undefined;
    if (hasNext && items.length > 0) {
      const lastItem = items[items.length - 1];
      const cursorPayload = {
        id: lastItem.id,
        [options.sortField]: lastItem[options.sortField],
      };
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString(
        'base64',
      );
    }

    let total: number | undefined;
    const countStartTime = Date.now();
    if (includeTotal) {
      total = estimateTotal
        ? await this.getEstimatedCount(where)
        : await this.prisma.battle.count({ where });
    }
    const countTime = Date.now() - countStartTime;

    const pagination: CursorPagination = {
      size,
      hasNext,
      hasPrev: !!cursor,
      nextCursor,
      total,
    };

    return {
      data: items,
      pagination,
      strategy: PaginationStrategy.CURSOR,
      performance: {
        queryTime: 0, // Will be set by caller
        countTime: includeTotal ? countTime : undefined,
        totalItems: total,
        estimatedTotal: estimateTotal && !!total,
      },
    };
  }

  private buildCursorWhere(
    where: any,
    cursorData: any,
    options: PaginationOptions,
  ): any {
    if (!cursorData) {
      return where;
    }

    const { sortField, sortOrder } = options;
    const operator = sortOrder === SortOrder.DESC ? 'lt' : 'gt';

    return {
      ...where,
      OR: [
        {
          [sortField]: {
            [operator]: cursorData[sortField],
          },
        },
        {
          [sortField]: cursorData[sortField],
          id: {
            [operator]: cursorData.id,
          },
        },
      ],
    };
  }

  private buildOrderBy(sortField: SortField, sortOrder: SortOrder): any {
    const order = sortOrder === SortOrder.ASC ? 'asc' : 'desc';
    return [{ [sortField]: order }, { id: order }];
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
      } else {
        const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count
          FROM (
            SELECT 1 FROM battles
            WHERE ${this.buildWhereClause(where)}
            LIMIT 100000
          ) as limited_count;
        `;
        return Number(result[0]?.count || 0);
      }
    } catch (error) {
      this.logger.warn('Failed to get estimated count, falling back', error);
      return this.prisma.battle.count({ where });
    }
  }

  private buildWhereClause(where: any): string {
    const conditions: string[] = [];

    Object.entries(where).forEach(([key, value]) => {
      if (typeof value === 'string') {
        conditions.push(`${key} = '${value}'`);
      } else if (typeof value === 'boolean') {
        conditions.push(`${key} = ${value}`);
      }
    });

    return conditions.join(' AND ') || 'TRUE';
  }
}
