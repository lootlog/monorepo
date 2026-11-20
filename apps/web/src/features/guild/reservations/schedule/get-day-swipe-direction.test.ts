import { describe, expect, it } from "vitest";
import { getDaySwipeDirection } from "./get-day-swipe-direction";

describe("getDaySwipeDirection", () => {
  it.each([
    { offsetX: -80, width: 360, expected: 1 },
    { offsetX: 80, width: 360, expected: -1 },
    { offsetX: -48, width: 390, expected: 1 },
    { offsetX: 48, width: 390, expected: -1 },
    { offsetX: -96, width: 840, expected: 1 },
    { offsetX: 96, width: 840, expected: -1 },
  ] as const)(
    "returns $expected for a committed $offsetX px drag at $width px",
    ({ expected, offsetX, width }) => {
      expect(getDaySwipeDirection({ offsetX, velocityX: 0, width })).toBe(
        expected,
      );
    },
  );

  it.each([
    { offsetX: -24, velocityX: -600, expected: 1 },
    { offsetX: 24, velocityX: 600, expected: -1 },
  ] as const)(
    "commits a fast flick with direction $expected",
    ({ expected, offsetX, velocityX }) => {
      expect(getDaySwipeDirection({ offsetX, velocityX, width: 840 })).toBe(
        expected,
      );
    },
  );

  it.each([
    { offsetX: -35, velocityX: 0, width: 360 },
    { offsetX: 39, velocityX: 0, width: 840 },
    { offsetX: -23, velocityX: -900, width: 360 },
    { offsetX: 24, velocityX: 599, width: 360 },
    { offsetX: 80, velocityX: 900, width: 0 },
  ])("rejects an incomplete gesture %#", (gesture) => {
    expect(getDaySwipeDirection(gesture)).toBeNull();
  });
});
