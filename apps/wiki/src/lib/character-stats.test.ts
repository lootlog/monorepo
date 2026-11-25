import { describe, expect, it } from "vitest";
import { baseAttributes, characterStats } from "./character-stats";

const worn = (type: string, stat: string) => ({ item: { type, stat } });

describe("character stats", () => {
  it("gives a warrior 4 strength a level to 20 and 5 from 21", () => {
    expect(baseAttributes("w", 1)).toEqual({
      strength: 4,
      agility: 3,
      intellect: 3,
    });
    expect(baseAttributes("w", 100)).toEqual({
      strength: 480,
      agility: 22,
      intellect: 3,
    });
  });

  it("derives life, crit and evade from the level as the game documents", () => {
    const stats = characterStats("w", 100, [], new Map());

    expect(stats.hp).toBe(13_646);
    expect(stats.critChance).toBe(3);
    expect(stats.evadePoints).toBe(1);
    expect(stats.evadeChance).toBeCloseTo(0.2);
    expect(stats.physical).toEqual({ min: 24, max: 24 });
  });

  it("deals an auxiliary blade's damage with the second hand", () => {
    const stats = characterStats(
      "b",
      100,
      [
        worn("ONE_HAND_WEAPON", "dmg=100,120;crit=2"),
        worn("HELP_WEAPON", "dmg=40,50;crit=5"),
      ],
      new Map(),
    );

    expect(stats.physical).toEqual({ min: 100, max: 120 });
    expect(stats.offhand).toEqual({ min: 40, max: 50 });
    expect(stats.critChance).toBe(5);
  });

  it("shares crit from other items and from skills between both hands, keeping each weapon's own", () => {
    const stats = characterStats(
      "b",
      100,
      [
        worn("ONE_HAND_WEAPON", "dmg=100,120;crit=2;critval=10"),
        worn("HELP_WEAPON", "dmg=40,50;crit=5;critval=20"),
        worn("RING", "crit=4;critval=30"),
      ],
      new Map([["crit", 8]]),
    );

    expect(stats.critChance).toBe(17);
    expect(stats.offhandCritChance).toBe(20);
    expect(stats.offhandCritValue - stats.critValue).toBeCloseTo(10);
  });

  it("gives a mage holding a wand and an orb no physical damage", () => {
    const stats = characterStats(
      "m",
      300,
      [worn("WAND_WEAPON", "frost=300,5723"), worn("ORB_WEAPON", "fire=3198")],
      new Map(),
    );

    expect(stats.physical).toEqual({ min: 0, max: 0 });
  });

  it("adds a quiver's attack to the bow and reads poison as slow and damage", () => {
    const stats = characterStats(
      "h",
      100,
      [
        worn("DISTANCE_WEAPON", "dmg=100,120;poison=120,50"),
        worn("QUIVER", "pdmg=10"),
      ],
      new Map(),
    );

    expect(stats.physical).toEqual({ min: 110, max: 130 });
    expect(stats.poison).toEqual({ slow: 1.2, damage: 50 });
  });

  it("caps absorption at seven times intellect", () => {
    const stats = characterStats(
      "m",
      50,
      [worn("ARMOR", "absorb=5000;absorbm=10")],
      new Map([["absorbm_per", 50]]),
    );

    expect(stats.absorb).toBe(stats.intellect * 7);
    expect(stats.absorbMagic).toBe(15);
  });

  it("adds skills' share of strength to the weapon's damage", () => {
    const stats = characterStats(
      "w",
      100,
      [worn("TWO_HAND_WEAPON", "dmg=100,200")],
      new Map([["str2h", 0.1]]),
    );

    expect(stats.physical).toEqual({ min: 148, max: 248 });
  });

  it("raises each element and damage over time by its own item bonus on top of all damage", () => {
    const stats = characterStats(
      "t",
      100,
      [
        worn("ONE_HAND_WEAPON", "fire=1000;poison=100,500;wound=10,400"),
        worn("RING", "dmgmul=10;dmgmulfire=20;dmgmulpoison=50;dmgmulwound=25"),
      ],
      new Map(),
    );

    expect(stats.fire).toEqual({ min: 1056, max: 1584 });
    expect(stats.poison.damage).toBe(825);
    expect(stats.wound.damage).toBe(550);
  });

  it("keeps the auxiliary weapon's poison and wound apart from the main weapon's", () => {
    const stats = characterStats(
      "b",
      100,
      [
        worn("ONE_HAND_WEAPON", "dmg=100,120;wound=10,400"),
        worn("HELP_WEAPON", "dmg=40,50;poison=80,300;wound=5,200"),
      ],
      new Map(),
    );

    expect(stats.wound).toEqual({ chance: 10, damage: 400 });
    expect(stats.offhandPoison).toEqual({ slow: 0.8, damage: 300 });
    expect(stats.offhandWound).toEqual({ chance: 5, damage: 200 });
  });

  it("takes the holder's own healing down by its item's adest, never below zero", () => {
    const healing = (stat: string) =>
      characterStats("w", 100, [worn("ARMOR", stat)], new Map()).healing;

    expect(healing("heal=500;adest=200")).toBe(300);
    expect(healing("heal=100;adest=200")).toBe(0);
  });

  it("adds crit strength from strength and intellect only above level 20", () => {
    const critValues = (level: number) => {
      const stats = characterStats("w", level, [], new Map());

      return [stats.critValue, stats.critMagicValue];
    };

    expect(critValues(20)).toEqual([120, 120]);
    expect(critValues(21)[0]).toBeGreaterThan(120);
  });
});
