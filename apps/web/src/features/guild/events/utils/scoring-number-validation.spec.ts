import { expect, it } from "vitest";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringCondition,
} from "@lootlog/domain/scoring";
import { hasValidScoringNumbers } from "./scoring-number-validation";

const withCondition = (condition: EventScoringCondition) => ({
  ...DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  rules: [
    {
      id: "rule",
      conditions: [condition],
      action: { type: "SET_BASE" as const, points: 1 },
    },
  ],
});

const groupSize = (
  size: { comparison: "EXACT" | "BETWEEN"; value: number; to: number },
  percentages = { minSharePercentage: 50, minTimePercentage: 90 },
): EventScoringCondition => ({
  type: "GROUP_SIZE",
  counting: "TIMELINE",
  size,
  ...percentages,
});

it.each([
  [
    "a fractional group size",
    groupSize({ comparison: "EXACT", value: 2.5, to: 2.5 }),
  ],
  ["an empty group", groupSize({ comparison: "EXACT", value: 0, to: 0 })],
  ["an inverted range", groupSize({ comparison: "BETWEEN", value: 4, to: 2 })],
  [
    "a share above 100%",
    groupSize(
      { comparison: "EXACT", value: 1, to: 1 },
      { minSharePercentage: 50, minTimePercentage: 101 },
    ),
  ],
  ["a negative tolerance", { type: "RESPAWN_JOIN", toleranceSeconds: -1 }],
  ["a fractional tolerance", { type: "RESPAWN_JOIN", toleranceSeconds: 1.5 }],
] satisfies Array<[string, EventScoringCondition]>)(
  "rejects %s",
  (_name, condition) => {
    expect(hasValidScoringNumbers(withCondition(condition))).toBe(false);
  },
);

it("accepts the solo condition and a zero tolerance", () => {
  expect(
    hasValidScoringNumbers(
      withCondition(groupSize({ comparison: "BETWEEN", value: 1, to: 4 })),
    ),
  ).toBe(true);
  expect(
    hasValidScoringNumbers(
      withCondition({ type: "RESPAWN_JOIN", toleranceSeconds: 0 }),
    ),
  ).toBe(true);
});
