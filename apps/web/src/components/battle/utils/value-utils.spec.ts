import { describe, expect, it } from "vitest";
import { processDamageValue, roundHpPercentage } from "./value-utils";

describe("roundHpPercentage", () => {
  it("keeps two decimals for non-full hp values", () => {
    expect(roundHpPercentage(96.85)).toBe("96.85");
  });

  it("renders exact non-full hp values with two decimals", () => {
    expect(roundHpPercentage(61)).toBe("61.00");
  });

  it("keeps full and zero hp compact", () => {
    expect(roundHpPercentage(100)).toBe("100");
    expect(roundHpPercentage(0)).toBe("0");
  });

  it("formats damage values with a leading separator", () => {
    expect(processDamageValue("427", "-")).toBe(" -427");
    expect(processDamageValue("7389", "+")).toBe(" +7389");
  });
});
