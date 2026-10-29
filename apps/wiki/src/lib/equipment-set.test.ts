import { describe, expect, it } from "vitest";
import { decodeEquipmentSet, encodeEquipmentSet } from "./equipment-set";
import { findRequirementIssues, sumItemStats } from "./item-stat-totals";

describe("equipment set link", () => {
  it("opens the set it was shared from", () => {
    const set = {
      profession: "h" as const,
      level: 250,
      items: { helmet: 12_345, weapon: 678, boots: 9 },
    };

    expect(decodeEquipmentSet(encodeEquipmentSet(set))).toEqual(set);
  });

  it("keeps the readable parts of a mangled link", () => {
    expect(decodeEquipmentSet("x999_h12_zz_q5_b7")).toEqual({
      profession: null,
      level: null,
      items: { helmet: 12, boots: 7 },
    });
  });
});

describe("equipment set stats", () => {
  it("adds up numeric stats and skips the rest", () => {
    expect(
      sumItemStats(["hp=500;crit=2;binds", "hp=250;legbon=lastheal,200"]),
    ).toEqual({ hp: 750, crit: 2 });
  });

  it("flags an item another profession or a higher level needs", () => {
    const character = { profession: "m" as const, level: 120 };

    expect(findRequirementIssues("reqp=wh;lvl=150", character)).toEqual([
      "profession",
      "level",
    ]);
    expect(findRequirementIssues("reqp=mt;lvl=100", character)).toEqual([]);
  });
});
