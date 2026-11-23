import { describe, expect, it } from "vitest";
import {
  findUnstableScenarios,
  formatRenderComparison,
} from "./render-metrics";

const report = (renders: number, components: Record<string, number>) => ({
  commits: 1,
  renders,
  components,
});

describe("render metrics", () => {
  it("flags a scenario whose component counts differ between runs even when totals match", () => {
    const first = {
      chat: report(3, { Row: 2, List: 1 }),
      notes: report(1, {}),
    };

    const second = {
      chat: report(3, { Row: 1, List: 2 }),
      notes: report(1, {}),
    };

    expect(findUnstableScenarios([first, first, second])).toEqual(["chat"]);
  });

  it("lists every scenario and ranks the components whose renders moved most", () => {
    const comparison = formatRenderComparison(
      { chat: report(503, { Row: 500, List: 3 }) },
      {
        chat: report(5, { Row: 1, List: 3, Popup: 1 }),
        notes: report(2, { Note: 2 }),
      },
    );

    expect(comparison).toContain("| chat | 1 | 503 → 5 (-498, -99%) |");
    expect(comparison).toContain("| notes | 0 → 1 (+1) | 0 → 2 (+2) |");
    expect(comparison.indexOf("`Row`")).toBeLessThan(
      comparison.indexOf("`Popup`"),
    );
    expect(comparison).not.toContain("`List`");
  });
});
