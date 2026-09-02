import type {
  InMemoryPaginationOptions,
  InMemoryPaginationResult,
} from "#src/battles/services/battle-analytics.types";

export class BattleAnalyticsPagingService {
  paginate<TRecord>(
    records: TRecord[],
    options: InMemoryPaginationOptions,
  ): InMemoryPaginationResult<TRecord> {
    const totalRecords = records.length;
    const size = options.size ?? 20;
    const startIndex = this.decodeCursor(options.cursor);
    const endIndex = startIndex + size;
    const paginatedRecords = records.slice(startIndex, endIndex);
    const hasNext = endIndex < totalRecords;
    const hasPrev = startIndex > 0;

    return {
      records: paginatedRecords,
      totalRecords,
      pagination: {
        size,
        hasNext,
        hasPrev,
        nextCursor: hasNext ? this.encodeCursor(endIndex) : undefined,
        previousCursor: hasPrev
          ? this.encodeCursor(Math.max(0, startIndex - size))
          : undefined,
        total: options.includeTotal ? totalRecords : undefined,
      },
    };
  }

  private encodeCursor(index: number): string {
    return Buffer.from(index.toString()).toString("base64");
  }

  private decodeCursor(cursor: string | undefined): number {
    if (!cursor) {
      return 0;
    }

    try {
      const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
      const cursorIndex = Number.parseInt(decodedCursor, 10);
      return Number.isNaN(cursorIndex) || cursorIndex < 0 ? 0 : cursorIndex;
    } catch {
      return 0;
    }
  }
}
