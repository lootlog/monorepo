import { describe, expect, it } from "vitest";
import { formatItemHid, isItemHid, parseItemHid } from "@/lib/utils/hid-detection";

describe("isItemHid", () => {
  it("accepts valid values with surrounding whitespace", () => {
    expect(isItemHid("  ITEM#123.Aldous  ")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isItemHid("ITEM#123")).toBe(false);
  });
});

describe("parseItemHid", () => {
  it("returns parsed hid and world for valid values", () => {
    expect(parseItemHid("  ITEM#abc-123.Legion  ")).toEqual({
      hid: "abc-123",
      world: "Legion",
    });
  });

  it("returns null for invalid values", () => {
    expect(parseItemHid("not-an-item-hid")).toBeNull();
  });
});

describe("formatItemHid", () => {
  it("formats hid values consistently", () => {
    expect(formatItemHid("abc-123", "Legion")).toBe("ITEM#abc-123.Legion");
  });
});
