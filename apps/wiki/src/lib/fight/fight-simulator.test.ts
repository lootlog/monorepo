import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import { describe, expect, test } from "vitest";
import { fightBattlePayload } from "./fight-battle-log";
import { simulateFight, type FightEvent } from "./fight-simulator";
import { NO_LEGENDARY_BONUSES, type Combatant } from "./fight-state";
import type { ActiveSkill } from "./fight-skills";
import { seededRandom, simulateFights } from "./fight-summary";

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
  legendary: NO_LEGENDARY_BONUSES,
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

describe("fightBattlePayload", () => {
  test("logs a fight that the battle processor reads back with the simulated damage, bonuses and winner", () => {
    const doubleShot: ActiveSkill = {
      id: 97,
      name: "Podwójny strzał",
      resource: "energy",
      cost: 10,
      cooldown: 2,
      effects: new Map([["add_attacks", { value: 1, turns: 1 }]]),
    };

    const setup = {
      teams: [
        [
          fighter({
            name: "Łowca",
            poison: { damage: 300, slow: 0.1 },
            wound: { chance: 30, damage: 400 },
            critChance: 40,
            pierce: 30,
            healing: 500,
            actives: [doubleShot],
            legendary: {
              ...NO_LEGENDARY_BONUSES,
              curse: 20,
              holytouch: 15,
              anguish: { chance: 20, damage: 700 },
              verycrit: 30,
              puncture: 12,
            },
          }),
        ],
        [
          fighter({
            name: "Wojownik",
            profession: "w",
            hp: 60_000,
            blockPoints: 400,
            armor: 800,
            fire: { min: 300, max: 500 },
            legendary: {
              ...NO_LEGENDARY_BONUSES,
              glare: 20,
              facade: 13,
              critred: 25,
              lastheal: { min: 36, max: 44 },
            },
          }),
        ],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(11), (event) => {
      events.push(event);
    });

    const battle = new BattleProcessor("full").processBattle(
      fightBattlePayload(setup, events, result),
    );

    const overTimeTaken = (actor: number) =>
      events.reduce(
        (total, event) =>
          event.kind === "damageOverTime" && event.actor === actor
            ? total + event.poison + event.wound + event.anguish
            : total,
        0,
      );

    const [hunter, warrior] = result.fighters;

    expect(battle.outcome.winningTeam).toBe((result.winner ?? -1) + 1);
    expect(battle.warriors.map((entry) => entry.damageTaken)).toEqual([
      (warrior?.damageDealt ?? 0) + overTimeTaken(0),
      (hunter?.damageDealt ?? 0) + overTimeTaken(1),
    ]);
    expect(battle.warriors[0]?.spellsUsedMap).toEqual(
      Object.fromEntries(hunter?.skillUses ?? []),
    );

    const countOf = (actor: number, matches: (event: FightEvent) => boolean) =>
      events.filter((event) => event.actor === actor && matches(event)).length;

    const bonusHealed = (actor: number, bonus: string) =>
      events.reduce(
        (total, event) =>
          event.kind === "bonusHeal" &&
          event.actor === actor &&
          event.bonus === bonus
            ? total + event.amount
            : total,
        0,
      );

    expect(
      battle.warriors.map((entry) => [
        entry.turnsLost,
        entry.legbonCurse,
        entry.legbonHolytouchValue,
        entry.legbonLasthealValue,
      ]),
    ).toEqual(
      [0, 1].map((actor) => [
        countOf(actor, (event) => event.kind === "lostTurn"),
        countOf(actor, (event) => event.kind === "strike" && event.curse),
        bonusHealed(actor, "holytouch"),
        bonusHealed(actor, "lastheal"),
      ]),
    );
  });
});
