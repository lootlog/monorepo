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
});
