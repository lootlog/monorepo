import { describe, expect, it } from "vitest";
import { parseEditablePoints } from "./parse-editable-points";

describe("parseEditablePoints", () => {
  it("parses decimal values without truncating", () => {
    expect(parseEditablePoints("1.75")).toBe(1.75);
    expect(parseEditablePoints("0.25")).toBe(0.25);
  });

  it("keeps full floating-point precision from input", () => {
    expect(parseEditablePoints("1.234")).toBe(1.234);
    expect(parseEditablePoints("0.125")).toBe(0.125);
  });

  it("rejects invalid values", () => {
    expect(parseEditablePoints("-0.25")).toBeNull();
    expect(parseEditablePoints("NaN")).toBeNull();
    expect(parseEditablePoints("abc")).toBeNull();
  });
});
