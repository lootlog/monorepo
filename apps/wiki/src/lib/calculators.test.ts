import { describe, expect, it } from "vitest";
import {
  anguishDamage,
  attackSpeedFromAgility,
  defenceChance,
  LEGENDARY_BONUS_START_VALUES,
  legendaryBonusStrength,
  legendaryBonusValue,
  pointsForMaxDefence,
} from "./calculators";

// The examples and tables below are the game's, from its combat mechanics
// documentation at https://pomoc.margonem.pl/index/view,372.
describe("calculators", () => {
  it("measures evade and block against the enemy's level, capped at 300", () => {
    // 300 points against a level 100 enemy reach the cap.
    expect(defenceChance(300, 100)).toBe(50);
    // A level 400 enemy counts as 300.
    expect(defenceChance(300, 400)).toBe(20);
    expect(pointsForMaxDefence(400)).toBe(750);
  });

  it("gives attack speed from agility in two steps", () => {
    expect(attackSpeedFromAgility(50)).toBe(1);
    expect(attackSpeedFromAgility(150)).toBeCloseTo(2.1);
  });

  it("adds half of the previous share for each further item with a bonus", () => {
    const stacked = (start: number) =>
      [1, 2, 3, 4, 5, 6].map((count) =>
        legendaryBonusValue(
          start,
          Array.from({ length: count }, () => 1),
        ),
      );

    expect(stacked(LEGENDARY_BONUS_START_VALUES.facade)).toEqual([
      13, 20, 23, 25, 26, 26,
    ]);
    expect(stacked(LEGENDARY_BONUS_START_VALUES.cleanse)).toEqual([
      12, 18, 21, 23, 24, 24,
    ]);
    expect(stacked(LEGENDARY_BONUS_START_VALUES.anguish)).toEqual([
      8, 12, 14, 15, 16, 16,
    ]);
  });

  it("weakens a bonus linearly over 50 levels from its item's threshold", () => {
    // Below level 120 the bonus weakens from 30 levels above the item.
    expect(legendaryBonusStrength(130, 100)).toBe(1);
    expect(legendaryBonusStrength(155, 100)).toBe(0.5);
    expect(legendaryBonusStrength(180, 100)).toBe(0);
    // From level 120 it weakens from 1.25 times the item's level.
    expect(legendaryBonusStrength(250, 200)).toBe(1);
    expect(legendaryBonusStrength(300, 200)).toBe(0);
  });

  it("counts the least weakened item first", () => {
    expect(legendaryBonusValue(17, [0.5, 1])).toBe(17 + 4);
  });

  it("bleeds by the upgraded item level and the character's attributes", () => {
    const attributes = { strength: 200, intellect: 400, agility: 555 };

    expect(anguishDamage({ itemLevel: 80, upgrade: 0, ...attributes })).toBe(
      522,
    );
    // +5 raises level 80 to 90 by the documented upgrade formula; the
    // documentation's own +5 example says 95, against that formula.
    expect(anguishDamage({ itemLevel: 80, upgrade: 5, ...attributes })).toBe(
      anguishDamage({ itemLevel: 90, upgrade: 0, ...attributes }),
    );
    // An upgrade past level 300 adds nothing.
    expect(anguishDamage({ itemLevel: 290, upgrade: 5, ...attributes })).toBe(
      anguishDamage({ itemLevel: 300, upgrade: 0, ...attributes }),
    );
  });
});
