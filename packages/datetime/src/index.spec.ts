import { describe, expect, it } from "vitest";
import {
  calculateLocalWindowOverlapMs,
  isLocalTimeInRange,
  toUtcDateFromLocal,
} from "./index";

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
