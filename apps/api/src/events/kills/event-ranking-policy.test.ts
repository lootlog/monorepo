import { expect, it } from "bun:test";
import {
  isKillPointCountedInRanking,
  roundPoints,
} from "./event-ranking-policy.js";

it("excludes pending and late confirmations while counting the deadline inclusively", () => {
  const deadline = new Date("2026-09-18T10:00:00Z");

  expect(
    isKillPointCountedInRanking({
      confirmationDeadlineAt: null,
      confirmedAt: null,
    }),
  ).toBe(true);

  for (const [confirmedAt, expected] of [
    [null, false],
    [new Date(deadline.getTime() - 1), true],
    [deadline, true],
    [new Date(deadline.getTime() + 1), false],
  ] satisfies [Date | null, boolean][]) {
    expect(
      isKillPointCountedInRanking({
        confirmationDeadlineAt: deadline,
        confirmedAt,
      }),
    ).toBe(expected);
  }
});

it("keeps manual point adjustments at the same four-decimal precision as recalculation", () => {
  expect(roundPoints(1.23456)).toBe(1.2346);
  expect(roundPoints(-1.23456)).toBe(-1.2346);
  expect(roundPoints(0.1 + 0.2)).toBe(0.3);
});
