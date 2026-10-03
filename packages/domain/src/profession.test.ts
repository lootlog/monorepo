import { describe, expect, it } from "bun:test";
import {
  formatLevel,
  getProfByShortname,
  getShortnameByProf,
} from "./profession.js";

describe("Margonem professions", () => {
  it.each([
    ["b", "BLADE_DANCER"],
    ["h", "HUNTER"],
    ["m", "MAGE"],
    ["p", "PALADIN"],
    ["t", "TRACKER"],
    ["w", "WARRIOR"],
  ] as const)("maps %s in both directions", (shortname, profession) => {
    expect(getProfByShortname(shortname)).toBe(profession);
    expect(getShortnameByProf(profession)).toBe(shortname);
  });

  it("does not invent a profession for unknown runtime data", () => {
    expect(getProfByShortname("")).toBeUndefined();
    expect(getProfByShortname("unknown")).toBeUndefined();
    expect(getProfByShortname("toString")).toBeUndefined();
  });

  it("formats a level the same way from a profession or its shortname", () => {
    expect(formatLevel(300, "BLADE_DANCER")).toBe("300b");
    expect(formatLevel(300, "b")).toBe("300b");
    expect(formatLevel(300, null)).toBe("300");
  });
});
