import { describe, expect, test } from "bun:test";
import type { Combatant } from "./fight-simulator.js";
import { simulateFights } from "./fight-summary.js";

const NO_DAMAGE = { min: 0, max: 0 };

const fighter = (overrides: Partial<Combatant>): Combatant => ({
  name: "postać",
  profession: "h",
  level: 200,
  hp: 50_000,
  physical: { min: 1000, max: 1000 },
  offhand: NO_DAMAGE,
  fire: NO_DAMAGE,
  frost: NO_DAMAGE,
  light: NO_DAMAGE,
  poison: { damage: 0, slow: 0 },
  wound: { chance: 0, damage: 0 },
  attackSpeed: 20,
  critChance: 1,
  critValue: 120,
  critMagicValue: 120,
  critReduction: 0,
  pierce: 0,
  pierceBlock: 0,
  armor: 0,
  armorDestruction: 0,
  evadePoints: 0,
  evadeReduction: 0,
  blockPoints: 0,
  absorb: 0,
  absorbMagic: 0,
  resistFire: 0,
  resistFrost: 0,
  resistLight: 0,
  resistPoison: 0,
  resistWound: 0,
  healing: 0,
  healingReduction: 0,
  energy: 50,
  energyGain: 0,
  mana: 0,
  physicalBonus: 0,
  damageBonus: 0,
  damageTakenBonus: 0,
  enemySlow: 0,
  slowReduction: 0,
  fastArrowChance: 0,
  critSlow: 0,
  comboGain: { crit: 0, pierce: 0, wound: 0, block: 0 },
  actives: [],
  ...overrides,
});

const RUNS = { runs: 200, seed: 7 };

describe("simulateFights", () => {
  test("lets a full-evasion defender dodge a hunter but never a mage", () => {
    const dodger = fighter({ name: "unik", evadePoints: 10_000 });

    const hunter = simulateFights(
      { teams: [[fighter({ profession: "h" })], [dodger]] },
      RUNS,
    );

    const mage = simulateFights(
      {
        teams: [
          [
            fighter({
              profession: "m",
              physical: NO_DAMAGE,
              light: { min: 1000, max: 1000 },
            }),
          ],
          [dodger],
        ],
      },
      RUNS,
    );

    expect(hunter.fighters[0]?.evadedRate).toBeGreaterThan(0.4);
    expect(mage.fighters[0]?.evadedRate).toBe(0);
  });

  test("keeps a heavily slowed fighter acting at a third of its attack speed", () => {
    const summary = simulateFights(
      {
        teams: [
          [
            fighter({
              name: "spowolniony",
              hp: 10_000_000,
              physical: { min: 1, max: 1 },
            }),
          ],
          [
            fighter({
              name: "spowalniający",
              hp: 10_000_000,
              physical: { min: 1, max: 1 },
              enemySlow: 1000,
            }),
          ],
        ],
      },
      { runs: 1, seed: 1 },
    );

    const [slowed, slower] = summary.fighters;

    const ratio =
      (slowed?.averageMoves ?? 0) / Math.max(1, slower?.averageMoves ?? 0);

    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.37);
  });

  test("repeats the same outcome for the same seed", () => {
    const setup = {
      teams: [[fighter({ critChance: 40 })], [fighter({ evadePoints: 300 })]],
    };

    expect(simulateFights(setup, RUNS)).toEqual(simulateFights(setup, RUNS));
  });
});
