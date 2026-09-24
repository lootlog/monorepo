import type {
  InMemoryPaginationOptions,
  InMemoryPaginationResult,
} from "#src/battles/analytics/battle-analytics.types";

const encodeCursor = (index: number): string =>
  Buffer.from(index.toString()).toString("base64");

const decodeCursor = (cursor: string | undefined): number => {
  if (!cursor) return 0;

  try {
    const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorIndex = Number.parseInt(decodedCursor, 10);

    return Number.isNaN(cursorIndex) || cursorIndex < 0 ? 0 : cursorIndex;
  } catch {
    return 0;
  }
};

export const battleAnalyticsPaging = {
  getPage,
  paginate<TRecord>(
    records: TRecord[],
    options: InMemoryPaginationOptions,
  ): InMemoryPaginationResult<TRecord> {
    const page = getPage(records.length, options);

    return {
      records: records.slice(
        page.startIndex,
        page.startIndex + page.pagination.size,
      ),
      pagination: page.pagination,
      totalRecords: page.totalRecords,
    };
  },
};

export type BattleAnalyticsPaging = typeof battleAnalyticsPaging;

function getPage(totalRecords: number, options: InMemoryPaginationOptions) {
  const size = options.size ?? 20;
  const startIndex = decodeCursor(options.cursor);
  const endIndex = startIndex + size;
  const hasNext = endIndex < totalRecords;
  const hasPrev = startIndex > 0;

  return {
    startIndex,
    totalRecords,
    pagination: {
      size,
      hasNext,
      hasPrev,
      nextCursor: hasNext ? encodeCursor(endIndex) : undefined,
      previousCursor: hasPrev
        ? encodeCursor(Math.max(0, startIndex - size))
        : undefined,
      total: options.includeTotal ? totalRecords : undefined,
    },
  };
}
