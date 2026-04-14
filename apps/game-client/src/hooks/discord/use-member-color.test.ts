import { describe, expect, it } from "vitest";
import { useMemberColor } from "./use-member-color";

describe("useMemberColor", () => {
  it("returns direct member color when present", () => {
    expect(useMemberColor({ color: 0x12ab34 })).toBe("12ab34");
  });

  it('returns "FFF" for zero member color', () => {
    expect(useMemberColor({ color: 0 })).toBe("FFF");
  });

  it("falls back to the highest role color", () => {
    expect(
      useMemberColor({
        roles: [
          { position: 1, color: 0x111111 },
          { position: 5, color: 0xabcdef },
        ],
      }),
    ).toBe("abcdef");
  });

  it("returns fallback color when there is no member data", () => {
    expect(useMemberColor(undefined)).toBe("FFF");
    expect(useMemberColor({ roles: [] })).toBe("FFF");
  });
});
