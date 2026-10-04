import { describe, expect, it } from "bun:test";
import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
  toUtcDateFromLocal,
} from "./index.js";

describe("@lootlog/datetime", () => {
  it("converts a Warsaw local clock to UTC across winter and summer offsets", () => {
    expect(
      toUtcDateFromLocal(
        { year: 2026, month: 1, day: 15 },
        8,
        30,
        "Europe/Warsaw",
      ).toISOString(),
    ).toBe("2026-01-15T07:30:00.000Z");
    expect(
      toUtcDateFromLocal(
        { year: 2026, month: 7, day: 15 },
        8,
        30,
        "Europe/Warsaw",
      ).toISOString(),
    ).toBe("2026-07-15T06:30:00.000Z");
  });

  it("resolves Warsaw clocks skipped or repeated by a DST transition", () => {
    // 02:30 does not exist on the spring-forward day: it moves past the gap.
    expect(
      toUtcDateFromLocal(
        { year: 2026, month: 3, day: 29 },
        2,
        30,
        "Europe/Warsaw",
      ).toISOString(),
    ).toBe("2026-03-29T01:30:00.000Z");
    // 02:30 happens twice on the fall-back day: the second occurrence wins.
    expect(
      toUtcDateFromLocal(
        { year: 2026, month: 10, day: 25 },
        2,
        30,
        "Europe/Warsaw",
      ).toISOString(),
    ).toBe("2026-10-25T01:30:00.000Z");
  });

  it("evaluates a local range that crosses midnight", () => {
    expect(
      isLocalTimeInRange({
        date: new Date("2026-01-15T22:30:00.000Z"),
        timeZone: "Europe/Warsaw",
        from: "22:00",
        to: "03:00",
      }),
    ).toBe(true);
  });

  it.each([
    ["2026-01-01T00:00:00Z", "2026-01-01T02:00:00Z", 2],
    ["2026-01-15T04:00:00Z", "2026-01-15T07:00:00Z", 1],
    ["2026-01-15T00:00:00Z", "2026-01-16T07:00:00Z", 13],
    ["2026-03-28T23:00:00Z", "2026-03-29T04:00:00Z", 5],
    ["2026-10-24T22:00:00Z", "2026-10-25T05:00:00Z", 7],
  ])(
    "includes the overnight window from the previous local date for %s to %s",
    (start, end, expectedHours) => {
      expect(
        calculateLocalWindowOverlapMs({
          startUtc: new Date(start),
          endUtc: new Date(end),
          timeZone: "Europe/Warsaw",
          windowFrom: "22:00",
          windowTo: "06:00",
        }),
      ).toBe(expectedHours * 60 * 60 * 1000);
    },
  );

  it("calculates overlap through the Warsaw DST forward transition", () => {
    expect(
      calculateLocalWindowOverlapMs({
        startUtc: new Date("2026-03-29T00:00:00.000Z"),
        endUtc: new Date("2026-03-29T06:00:00.000Z"),
        timeZone: "Europe/Warsaw",
        windowFrom: "03:00",
        windowTo: "08:00",
      }),
    ).toBe(5 * 60 * 60 * 1000);
  });
});
