import { describe, expect, it } from "vitest";
import {
  activityLevel,
  calendarOffset,
  calendarRange,
} from "./activity-calendar";

describe("activity calendar", () => {
  it("keeps missing history distinct from measured inactivity and four levels", () => {
    expect(activityLevel(null, 100)).toBe("unknown");
    expect(activityLevel(0, 100)).toBe("zero");
    expect([1, 26, 51, 100].map((value) => activityLevel(value, 100))).toEqual([
      1, 2, 3, 4,
    ]);
  });
  it("uses Warsaw date across midnight and DST", () => {
    expect(calendarRange(new Date("2026-03-29T22:30:00Z"), 7)).toEqual({
      from: "2026-03-24",
      to: "2026-03-30",
    });
    expect(calendarRange(new Date("2026-01-01T23:30:00Z"), 365)).toEqual({
      from: "2025-01-03",
      to: "2026-01-02",
    });
    expect(calendarOffset("2026-03-30")).toBe(0);
  });
});
