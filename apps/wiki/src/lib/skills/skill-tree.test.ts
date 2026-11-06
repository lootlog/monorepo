import { describe, expect, it } from "vitest";
import {
  SET_STAT_SECTIONS,
  type SetStatDefinition,
} from "@/lib/item-stat-totals";
import { skillEffectLine } from "./skill-effects";
import { setStatValueWithSkills, sumSkillBonuses } from "./skill-stats";
import {
  type SkillDefinition,
  skillPointsAt,
  skillRankRange,
  type SkillWeapon,
} from "./skill-tree";

const skill = (
  id: number,
  level: number,
  ranks: string[],
  weapons: SkillWeapon[] = [],
): SkillDefinition => ({
  id,
  name: `Skill ${id}`,
  description: "",
  level,
  maxRank: 10,
  active: false,
  row: 0,
  column: id,
  element: "support",
  icon: [0, 0],
  weapons,
  ranks: Array.from(
    { length: 10 },
    (_, index) => ranks[index] ?? ranks[0] ?? "",
  ),
});

const first = skill(1, 25, ["crit=4"]);

const second = skill(2, 35, ["hp=3*lvl"]);

const tree = [first, second];

const statById = (id: string) => {
  const stat = SET_STAT_SECTIONS.flatMap(
    (section): readonly SetStatDefinition[] => section.stats,
  ).find((candidate) => candidate.id === id);

  if (!stat) throw new Error(`No set stat ${id}`);

  return stat;
};

describe("skill points", () => {
  it("grows by one a level from 25 and stops at 300", () => {
    expect(skillPointsAt(24)).toBe(0);
    expect(skillPointsAt(25)).toBe(1);
    expect(skillPointsAt(400)).toBe(276);
  });

  it("opens a tier only once the points it asks for are spent", () => {
    expect(skillRankRange(tree, second, { 1: 9 }, 100).max).toBe(0);
    expect(skillRankRange(tree, second, { 1: 10 }, 100).max).toBe(10);
  });

  it("raises a skill only with the points the level leaves", () => {
    expect(skillRankRange(tree, second, { 1: 10 }, 40).max).toBe(6);
  });

  it("keeps the points a learned higher tier stands on", () => {
    expect(skillRankRange(tree, first, { 1: 10, 2: 1 }, 100).min).toBe(10);
    expect(skillRankRange(tree, first, { 1: 10 }, 100).min).toBe(0);
  });

  it("frees every rank of a tree a lower level made unlearnable", () => {
    expect(skillRankRange(tree, first, { 1: 5, 2: 3 }, 100).min).toBe(0);
  });
});

describe("skill stats", () => {
  const twoHanded = skill(3, 25, ["crit=4;hp=3*lvl;ac2_per=20"], ["2h"]);

  it("count only while the set wears what the skill needs", () => {
    expect(sumSkillBonuses([twoHanded], { 3: 1 }, 100, new Set())).toEqual(
      new Map(),
    );
    expect(
      sumSkillBonuses([twoHanded], { 3: 1 }, 100, new Set(["2h"])),
    ).toEqual(
      new Map([
        ["crit", 4],
        ["hp", 300],
        ["ac2_per", 20],
      ]),
    );
  });

  it("raise the items' armor by a percentage and add their own", () => {
    const bonuses = new Map([
      ["ac2_per", 20],
      ["ac", 30],
    ]);

    expect(
      setStatValueWithSkills({ ac: 100 }, statById("ac"), bonuses, 200),
    ).toBe(150);
    expect(setStatValueWithSkills({}, statById("ac"), bonuses, 200)).toBe(30);
  });

  it("turn a percentage of evade into points at the level", () => {
    const bonuses = new Map([["evade_per", 4]]);

    expect(
      setStatValueWithSkills({ evade: 10 }, statById("evade"), bonuses, 300),
    ).toBe(70);
  });
});

describe("skill effect lines", () => {
  it("read as the game's skill window words them", () => {
    expect(skillEffectLine("str2h", "0.1", 100)).toBe(
      "Atak broni dwuręcznej +10% siły (efekt pasywny)",
    );
    expect(skillEffectLine("hp", "3*lvl", 100)).toBe(
      "Życie +300 (rośnie z poziomem postaci, do 300)",
    );
    expect(skillEffectLine("cooldown", "2", 100)).toBe(
      "Czas odnowienia: 2 tury",
    );
  });
});
