import { describe, expect, test } from "vitest";
import { fightBattleLog } from "./fight-battle-log";
import { simulateFight } from "./fight-simulator";
import type { FightEvent } from "./fight-events";
import { armorReduced, evadeChance } from "./fight-defence";
import {
  createState,
  NO_PASSIVE_EFFECTS,
  type Combatant,
  type PassiveEffects,
} from "./fight-state";
import { seededRandom } from "./fight-summary";
import { NO_SKILL } from "./fight-skills";
import { strike } from "./fight-strike";
import { fighter, NO_DAMAGE } from "./fight.fixtures";

const tough = { hp: 10_000_000, physical: { min: 1000, max: 1000 } };

const withPassives = (
  passives: Partial<PassiveEffects>,
  rest: Partial<Combatant> = {},
) => ({ ...rest, passives: { ...NO_PASSIVE_EFFECTS, ...passives } });

const fightOf = (mine: Partial<Combatant>, theirs: Partial<Combatant>) => {
  const setup = {
    teams: [
      [fighter({ ...tough, ...mine })],
      [fighter({ ...tough, attackSpeed: 1, physical: NO_DAMAGE, ...theirs })],
    ],
  };

  const events: FightEvent[] = [];

  const result = simulateFight(setup, seededRandom(5), (event) => {
    events.push(event);
  });

  return {
    events,
    rows: fightBattleLog(setup, events, result).payload.events[0]?.f?.m ?? [],
  };
};

const strikesBy = (events: readonly FightEvent[], actor: number) =>
  events.flatMap((event) =>
    event.kind === "strike" && event.actor === actor ? [event] : [],
  );

describe("passive skill effects", () => {
  test("injures for 15% of the main weapon's damage on each of three turns, cut by wound resistance", () => {
    const { events, rows } = fightOf(withPassives({ injureChance: 100 }), {
      resistWound: 30,
    });

    const [hit] = strikesBy(events, 0);
    const injure = Math.floor(0.15 * (hit?.damage.physical ?? 0));

    expect(hit?.triggers.injure).toBe(injure);
    expect(
      rows.some((row) =>
        row.endsWith(`;0;injure=${Math.round(injure * 0.7)},30`),
      ),
    ).toBe(true);
  });

  test("blocks an arrow to no damage but never a melee strike", () => {
    const blocked = (profession: Combatant["profession"]) =>
      strikesBy(
        fightOf({ profession }, withPassives({ arrowBlockChance: 100 })).events,
        0,
      ).every((hit) => hit.arrowBlocked && hit.damage.physical === 0);

    expect(blocked("h")).toBe(true);
    expect(blocked("w")).toBe(false);
  });

  test("lands the blade dancer's third attack even when the main strike is evaded", () => {
    const hits = strikesBy(
      fightOf(
        {
          profession: "b",
          offhand: { min: 100, max: 100 },
          ...withPassives({ thirdAttackChance: 100 }),
        },
        { evadePoints: 10_000 },
      ).events,
      0,
    );

    expect(hits.some((hit) => hit.evaded)).toBe(true);
    expect(hits.every((hit) => hit.damage.third === 1000)).toBe(true);
  });

  test("keeps the third attack out of absorption and under armor even on a pierce", () => {
    const [hit] = strikesBy(
      fightOf(
        {
          profession: "b",
          pierce: 100,
          offhand: { min: 100, max: 100 },
          ...withPassives({ thirdAttackChance: 100 }),
        },
        { armor: 500, absorb: 100_000 },
      ).events,
      0,
    );

    expect(hit?.pierced).toBe(true);
    expect(hit?.damage.third).toBe(Math.round(armorReduced(1000, 500)));
  });

  test("crushes for its share of the main damage once enough of the strike gets through, raised by unavoidable damage", () => {
    const crushed = (armor: number, unavoidableBonus = 0) =>
      strikesBy(
        fightOf(
          withPassives(
            { crush: { value: 10, bound: 40 } },
            { unavoidableBonus },
          ),
          { armor },
        ).events,
        0,
      )[0]?.unavoidable;

    expect(crushed(0)).toBe(100);
    expect(crushed(0, 3)).toBe(103);
    expect(crushed(1500)).toBe(0);
  });

  test("enrages a critically hit fighter, raising only its physical damage and logging the share first", () => {
    const { events, rows } = fightOf(
      { critChance: 100, critValue: 100 },
      {
        rageTurns: 3,
        physical: { min: 1000, max: 1000 },
        fire: { min: 1000, max: 1000 },
      },
    );

    const [enraged] = strikesBy(events, 1);

    expect(enraged?.rage).toBe(100);
    expect(enraged?.strength).toMatchObject({ physical: 1100, fire: 1000 });
    expect(rows.some((row) => /^2=[\d.]+;1=[\d.]+;\+rage=100;/.test(row))).toBe(
      true,
    );
  });

  test("destroys extra armor in the same strike when a crit pierces", () => {
    const attacker = createState(
      fighter({
        critChance: 100,
        pierce: 100,
        armorDestruction: 100,
        ...withPassives({ critPierce: 80 }),
      }),
      0,
      0,
    );

    const defender = createState(fighter({ armor: 10_000 }), 1, 1);
    const hit = strike(attacker, defender, NO_SKILL, seededRandom(5));

    expect(hit.triggers.critPierce).toBe(80);
    expect(defender.armorLost).toBe(180);
  });

  test("restores energy on a crit and cuts the target's next item heal after a poisoned crit", () => {
    const { events, rows } = fightOf(
      {
        critChance: 100,
        energy: 100,
        ...withPassives({
          energyBack: 10,
          critPoison: { value: 50, bound: 100 },
        }),
      },
      { healing: 1000 },
    );

    const [hit] = strikesBy(events, 0);

    expect(hit?.triggers.critPoison).toBe(50);
    expect(rows.some((row) => row.endsWith(";0;heal=500,-50"))).toBe(true);
  });

  test("weakens the strikes of an enemy who is poisoned", () => {
    const { events, rows } = fightOf(
      {},
      {
        physical: { min: 1, max: 1 },
        poison: { damage: 10, slow: 0 },
        ...withPassives({ poisonWeakening: 10 }),
      },
    );

    const weakened = strikesBy(events, 0).filter(
      (hit) => hit.poisonWeakened > 0 && !hit.crit,
    );

    expect(weakened.length).toBeGreaterThan(0);
    expect(weakened.every((hit) => hit.damage.physical === 900)).toBe(true);
    expect(rows[0]).toBe("2=100.00;0;poison_lowdmg_per-enemies=10");
  });

  test("raises the whole team's health with an ally health aura", () => {
    const { events } = fightOf(
      { hp: 10_000, ...withPassives({ allyHealth: 10 }) },
      {},
    );

    const [hit] = strikesBy(events, 0);

    expect(hit?.hp[0]).toBe(11_000);
  });

  test("adds adrenaline evade at low health within the 50% cap and before a skill's reduction", () => {
    const attacker = createState(fighter({ profession: "h" }), 0, 0);

    const defender = createState(
      fighter({
        evadePoints: 200,
        ...withPassives({ adrenalinEvade: { value: 40, bound: 30 } }),
      }),
      1,
      1,
    );

    expect(evadeChance(defender, attacker, 0)).toBeCloseTo(0.2);

    defender.hp = 0.2 * defender.combatant.hp;

    expect(evadeChance(defender, attacker, 0)).toBe(0.5);
    expect(evadeChance(defender, attacker, 30)).toBeCloseTo(0.3);
    expect(evadeChance(defender, attacker, 100)).toBe(0);
  });
});
