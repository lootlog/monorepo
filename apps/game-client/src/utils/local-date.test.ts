import { afterEach, describe, expect, it, vi } from "vitest";
import { format, isToday, isYesterday } from "./local-date";

describe("local date formatting", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["HH:mm", "05:06"],
    ["HH:mm:ss", "05:06:07"],
    ["dd.MM", "09.04"],
    ["dd.MM.yyyy", "09.04.2026"],
    ["dd.MM HH:mm:ss", "09.04 05:06:07"],
    ["dd.MM.yyyy HH:mm:ss", "09.04.2026 05:06:07"],
    ["dd.MM.yyyy - HH:mm:ss", "09.04.2026 - 05:06:07"],
  ] as const)("preserves the %s date-fns output", (pattern, expected) => {
    expect(format(new Date(2026, 3, 9, 5, 6, 7), pattern)).toBe(expected);
  });

  it("compares today and yesterday in the local calendar across a year boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12));

    expect(isToday(new Date(2026, 0, 1, 0, 1))).toBe(true);
    expect(isToday(new Date(2025, 11, 31, 23, 59))).toBe(false);
    expect(isYesterday(new Date(2025, 11, 31, 23, 59))).toBe(true);
    expect(isYesterday(new Date(2025, 11, 30, 23, 59))).toBe(false);
  });
});
