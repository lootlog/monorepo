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

    // floor(20 * 100^1.375) + 480 strength * 5
    expect(stats.hp).toBe(13_646);
    expect(stats.critChance).toBe(3);
    // round(22 / 30) evade points over the level
    expect(stats.evadePoints).toBe(1);
    expect(stats.evadeChance).toBeCloseTo(0.2);
    // A character without a weapon fights with its fists.
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
