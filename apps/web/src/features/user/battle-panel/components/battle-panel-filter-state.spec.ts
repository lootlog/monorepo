import { describe, expect, it } from "vitest";
import {
  getPaginationDisplayRange,
  isLevelRangeActive,
  normalizeBattlePanelLevelRange,
} from "./battle-panel-filter-state";

describe("battle panel filter state", () => {
  it("detects default and active level ranges", () => {
    expect(isLevelRangeActive({})).toBe(false);
    expect(isLevelRangeActive({ minLevel: 1, maxLevel: 500 })).toBe(false);
    expect(isLevelRangeActive({ minLevel: 20, maxLevel: 500 })).toBe(true);
    expect(isLevelRangeActive({ minLevel: 1, maxLevel: 300 })).toBe(true);
  });

  it("normalizes missing level bounds to battle panel defaults", () => {
    expect(normalizeBattlePanelLevelRange({ minLevel: 40 })).toEqual({
      minLevel: 40,
      maxLevel: 500,
    });
  });

  it("returns a display range for cursor pagination pages", () => {
    expect(
      getPaginationDisplayRange({
        pageIndex: 1,
        pageSize: 20,
        totalCount: 45,
        visibleCount: 20,
      }),
    ).toEqual({ from: 21, to: 40 });

    expect(
      getPaginationDisplayRange({
        pageIndex: 2,
        pageSize: 20,
        totalCount: 45,
        visibleCount: 5,
      }),
    ).toEqual({ from: 41, to: 45 });
  });

  it("returns an empty display range when there are no visible rows", () => {
    expect(
      getPaginationDisplayRange({
        pageIndex: 0,
        pageSize: 20,
        totalCount: 0,
        visibleCount: 0,
      }),
    ).toEqual({ from: 0, to: 0 });
  });
});
