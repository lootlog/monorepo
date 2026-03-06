import { describe, expect, it } from "vitest";
import {
  parseEditablePoints,
  roundEditablePoints,
} from "./parse-editable-points";

describe("parseEditablePoints", () => {
  it("parses decimal values without truncating", () => {
    expect(parseEditablePoints("1.75")).toBe(1.75);
    expect(parseEditablePoints("0.25")).toBe(0.25);
  });

  it("rounds to two decimal places", () => {
    expect(parseEditablePoints("1.234")).toBe(1.23);
    expect(parseEditablePoints("1.235")).toBe(1.24);
  });

  it("rejects invalid values", () => {
    expect(parseEditablePoints("-0.25")).toBeNull();
    expect(parseEditablePoints("NaN")).toBeNull();
    expect(parseEditablePoints("abc")).toBeNull();
  });
});

describe("roundEditablePoints", () => {
  it("handles floating point precision edge cases", () => {
    expect(roundEditablePoints(1.005)).toBe(1.01);
  });
});
