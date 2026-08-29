import { describe, expect, it } from "vitest";
import { BattleAnalyticsPagingService } from "./battle-analytics-paging.service.js";

describe("BattleAnalyticsPagingService", () => {
  const service = new BattleAnalyticsPagingService();

  it("paginates records with cursor navigation metadata", () => {
    const firstPage = service.paginate(["a", "b", "c"], {
      includeTotal: true,
      size: 2,
    });

    expect(firstPage).toEqual({
      records: ["a", "b"],
      totalRecords: 3,
      pagination: {
        size: 2,
        hasNext: true,
        hasPrev: false,
        nextCursor: "Mg==",
        previousCursor: undefined,
        total: 3,
      },
    });

    const secondPage = service.paginate(["a", "b", "c"], {
      cursor: firstPage.pagination.nextCursor,
      includeTotal: true,
      size: 2,
    });

    expect(secondPage).toEqual({
      records: ["c"],
      totalRecords: 3,
      pagination: {
        size: 2,
        hasNext: false,
        hasPrev: true,
        nextCursor: undefined,
        previousCursor: "MA==",
        total: 3,
      },
    });
  });

  it("falls back to the first page for invalid cursors", () => {
    const page = service.paginate(["a", "b"], {
      cursor: "not-base64-index",
      size: 1,
    });

    expect(page.records).toEqual(["a"]);
    expect(page.pagination.hasNext).toBe(true);
    expect(page.pagination.hasPrev).toBe(false);
  });
});
