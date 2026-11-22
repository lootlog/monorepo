import { describe, expect, it } from "bun:test";
import { battleAnalyticsPaging } from "./battle-analytics-paging.service.js";

describe("battleAnalyticsPaging", () => {
  const service = battleAnalyticsPaging;

  it("paginates records with cursor navigation metadata", () => {
    const firstPage = service.paginate(["a", "b", "c"], {
      includeTotal: true,
      size: 2,
    });

    expect(firstPage).toStrictEqual({
      records: ["a", "b"],
      totalRecords: 3,
      pagination: {
        size: 2,
        hasNext: true,
        hasPrev: false,
        nextCursor: "Mg==",
        total: 3,
      },
    });

    const secondPage = service.paginate(["a", "b", "c"], {
      cursor: firstPage.pagination.nextCursor,
      includeTotal: true,
      size: 2,
    });

    expect(secondPage).toStrictEqual({
      records: ["c"],
      totalRecords: 3,
      pagination: {
        size: 2,
        hasNext: false,
        hasPrev: true,
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
