import { describe, it, expect } from "vitest";
import { parseMsToTime } from "@lootlog/ui/lib/date-utils";

describe("parseMsToTime", () => {
  it("should convert milliseconds to HH:MM:SS format", () => {
    expect(parseMsToTime(0)).toBe("00:00:00");
    expect(parseMsToTime(1000)).toBe("00:00:01");
    expect(parseMsToTime(60000)).toBe("00:01:00");
    expect(parseMsToTime(3600000)).toBe("01:00:00");
  });

  it("should handle complex time values", () => {
    expect(parseMsToTime(3661000)).toBe("01:01:01");
    expect(parseMsToTime(7325000)).toBe("02:02:05");
  });

  it("should pad single digits with zeros", () => {
    expect(parseMsToTime(5000)).toBe("00:00:05");
    expect(parseMsToTime(65000)).toBe("00:01:05");
    expect(parseMsToTime(3665000)).toBe("01:01:05");
  });

  it("should handle large hour values", () => {
    expect(parseMsToTime(36000000)).toBe("10:00:00");
    expect(parseMsToTime(86400000)).toBe("24:00:00");
  });
});
