import { describe, expect, it } from "bun:test";
import { getMemberDisplayRole } from "./member-display-role.js";

describe("getMemberDisplayRole", () => {
  it("skips a higher role without a color, as Discord does", () => {
    expect(
      getMemberDisplayRole([
        { position: 35, color: 0 },
        { position: 34, color: 0xa9c9ff },
        { position: 30, color: 0xae2011 },
      ]),
    ).toEqual({ position: 34, color: 0xa9c9ff });
  });

  it("picks the highest colored role regardless of input order", () => {
    expect(
      getMemberDisplayRole([
        { position: 2, color: 0x111111 },
        { position: 9, color: 0x222222 },
        { position: 5, color: 0x333333 },
      ])?.color,
    ).toBe(0x222222);
  });

  it("returns no role when none of the member's roles has a color", () => {
    expect(
      getMemberDisplayRole([
        { position: 3, color: 0 },
        { position: 1, color: null },
      ]),
    ).toBeUndefined();
  });
});
