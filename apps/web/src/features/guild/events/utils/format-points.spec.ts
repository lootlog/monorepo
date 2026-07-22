import { describe, expect, it } from "vitest";
import { formatPoints, formatSignedPoints } from "./format-points";

describe("formatPoints", () => {
  it("keeps whole numbers compact", () => {
    expect(formatPoints(3)).toBe("3");
    expect(formatPoints(-2)).toBe("-2");
  });

  it("formats decimal values with two fractional digits", () => {
    expect(formatPoints(1.5)).toBe("1.50");
    expect(formatPoints(0.25)).toBe("0.25");
  });

  it("rounds longer decimal values consistently", () => {
    expect(formatPoints(1.234)).toBe("1.23");
    expect(formatPoints(1.235)).toBe("1.24");
  });
});

describe("formatSignedPoints", () => {
  it("prefixes only positive values with a plus sign", () => {
    expect(formatSignedPoints(1.5)).toBe("+1.50");
    expect(formatSignedPoints(0)).toBe("0");
    expect(formatSignedPoints(-0.25)).toBe("-0.25");
  });
});
