import { describe, expect, it } from "vitest";
import { formatSeconds } from "@/utils/date/format-seconds";

describe("formatSeconds", () => {
  it("clamps negative values to zero", () => {
    expect(formatSeconds(-1)).toBe("0m 0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatSeconds(61)).toBe("1m 1s");
  });

  it("converts hours into total minutes", () => {
    expect(formatSeconds(3601)).toBe("60m 1s");
  });
});
