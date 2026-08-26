import { describe, expect, it } from "vitest";
import {
  COMPACT_SCHEDULE_MAX_WIDTH,
  shouldUseCompactSchedule,
} from "./use-compact-schedule-layout";

describe("shouldUseCompactSchedule", () => {
  it("uses the day layout when the schedule content is narrow", () => {
    expect(shouldUseCompactSchedule(688)).toBe(true);
    expect(shouldUseCompactSchedule(COMPACT_SCHEDULE_MAX_WIDTH - 1)).toBe(true);
  });

  it("keeps the week layout when every day has enough room", () => {
    expect(shouldUseCompactSchedule(COMPACT_SCHEDULE_MAX_WIDTH)).toBe(false);
    expect(shouldUseCompactSchedule(1_024)).toBe(false);
  });
});
