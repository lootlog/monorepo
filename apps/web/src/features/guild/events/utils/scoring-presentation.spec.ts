import { describe, expect, it } from "vitest";
import { getScoringBreakdown, getScoringItems } from "./scoring-presentation";
import { formatPoints } from "./format-points";
import { formatPoints as formatMemberPoints } from "../components/member-kills/member-kills-view-model";

describe("scoring presentation", () => {
  it("keeps manual adjustments outside bonus and cap calculations", () => {
    const scoring = getScoringBreakdown({
      points: 2.3,
      basePoints: 1,
      manualAdjustmentPoints: 0.5,
      bonusBreakdown: [{ ruleId: "bonus", ruleName: "Bonus", points: 1.2 }],
    });
    expect(scoring.bonusPoints).toBe(1.2);
    expect(scoring.capReduction).toBeCloseTo(0.4);
    const items = getScoringItems({
      ...scoring,
      t: (key) => key,
      formatPoints,
    });
    expect(items.map((item) => item.value)).toEqual([
      "1",
      "+1.20",
      "-0.40",
      "+0.50",
    ]);
    expect(
      getScoringItems({
        ...scoring,
        t: (key) => key,
        formatPoints: formatMemberPoints,
      }).map((item) => item.value),
    ).toEqual(["1", "+1.2", "-0.4", "+0.5"]);
  });
  it("uses the legacy bonus fallback when no explicit breakdown is available", () => {
    expect(
      getScoringBreakdown({
        points: 1.5,
        basePoints: 1,
        manualAdjustmentPoints: null,
        bonusBreakdown: null,
      }),
    ).toMatchObject({
      bonusPoints: 0.5,
      capReduction: 0,
      manualAdjustmentPoints: 0,
    });
  });
});
