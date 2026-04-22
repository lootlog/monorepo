import { describe, expect, it } from "vitest";
import { MAX_DURATION_SECONDS } from "../constants/max-duration-seconds";
import { parseDurationToSeconds } from "./add-timer-form-helpers";

describe("add-timer-form-helpers", () => {
  describe("parseDurationToSeconds", () => {
    it("parses hours, minutes, and seconds in mixed formats", () => {
      expect(parseDurationToSeconds("1h 2m 3s")).toBe(3723);
      expect(parseDurationToSeconds("1h2m3s")).toBe(3723);
      expect(parseDurationToSeconds("15m")).toBe(900);
      expect(parseDurationToSeconds("45s")).toBe(45);
    });

    it("returns zero for empty or malformed values", () => {
      expect(parseDurationToSeconds("")).toBe(0);
      expect(parseDurationToSeconds("   ")).toBe(0);
      expect(parseDurationToSeconds("abc")).toBe(0);
      expect(parseDurationToSeconds("1h garbage")).toBe(0);
      expect(parseDurationToSeconds("garbage 5m")).toBe(0);
    });

    it("caps the parsed duration at the configured maximum", () => {
      const overLimit = `${Math.ceil(MAX_DURATION_SECONDS / 3600) + 24}h`;

      expect(parseDurationToSeconds(overLimit)).toBe(MAX_DURATION_SECONDS);
    });
  });
});
