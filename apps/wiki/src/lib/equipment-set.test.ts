import { describe, expect, it } from "vitest";
import {
  decodeEquipmentSet,
  EMPTY_EQUIPMENT_SET,
  encodeEquipmentSet,
  equipItem,
} from "./equipment-set";
import {
  findRequirementIssues,
  SET_STAT_SECTIONS,
  type SetStatDefinition,
  setStatValue,
  sumItemStats,
} from "./item-stat-totals";

describe("equipment set link", () => {
  it("opens the set it was shared from", () => {
    const set = {
      profession: "h" as const,
      level: 250,
      items: {
        blessing: 60_532,
        helmet: 12_345,
        weapon: 678,
        boots: 9,
        armor: 19_775,
        gloves: 41,
      },
      upgrades: {
        weapon: { level: 5 as const, bonus: "ds" as const },
        boots: { level: 2 as const },
        armor: {
          level: 5 as const,
          bonus: "hp" as const,
          symbol: "critred" as const,
        },
        gloves: { level: 0 as const, symbol: "curse" as const },
      },
      skills: { 41: 10, 168: 3 },
    };

    expect(decodeEquipmentSet(encodeEquipmentSet(set))).toEqual(set);
  });

  it("keeps the readable parts of a mangled link", () => {
    expect(
      decodeEquipmentSet(
        "x999_h12u9_zz_q5_b7u3ds_g4u5xyz_n3-nothing_168x4_7x0_9xx",
      ),
    ).toEqual({
      profession: null,
      level: null,
      items: { helmet: 12, boots: 7, gloves: 4, necklace: 3 },
      upgrades: { boots: { level: 3 }, gloves: { level: 5 } },
      skills: { 168: 4 },
    });
  });
});

describe("equipping the hands", () => {
  const types = new Map([
    [1, "ONE_HAND_WEAPON"],
    [2, "TWO_HAND_WEAPON"],
    [3, "SHIELD"],
  ]);

  const typeOf = (id: number) => types.get(id);

  const wear = (ids: readonly number[]) =>
    ids.reduce(
      (set, id) =>
        equipItem(set, { id, type: types.get(id) ?? null }, undefined, typeOf),
      EMPTY_EQUIPMENT_SET,
    ).items;

  it("keeps a shield beside a one-handed weapon", () => {
    expect(wear([3, 1])).toEqual({ weapon: 1, secondary: 3 });
  });

  it("takes the shield off for a two-handed weapon, and the weapon off for a shield", () => {
    expect(wear([3, 2])).toEqual({ weapon: 2 });
    expect(wear([2, 3])).toEqual({ secondary: 3 });
  });
});

describe("equipment set stats", () => {
  it("adds up numeric stats and skips the rest", () => {
    expect(
      sumItemStats(["hp=500;crit=2;binds", "hp=250;legbon=lastheal,200"]),
    ).toEqual({ hp: 750, crit: 2 });
  });

  it("shows attack speed in whole points and attributes with all attributes", () => {
    const totals = sumItemStats(["sa=83;ds=20;da=5", "sa=251;da=10"]);

    const valueOf = (id: string) => {
      const stat = SET_STAT_SECTIONS.flatMap(
        (section): readonly SetStatDefinition[] => section.stats,
      ).find((candidate) => candidate.id === id);

      if (!stat) throw new Error(`No set stat ${id}`);

      return setStatValue(totals, stat);
    };

    expect(valueOf("sa")).toBe(3.34);
    expect(valueOf("strength")).toBe(35);
    expect(valueOf("agility")).toBe(15);
    expect(valueOf("ac")).toBeUndefined();
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
