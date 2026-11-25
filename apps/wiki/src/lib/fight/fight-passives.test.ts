import { describe, expect, test } from "vitest";
import { fightBattlePayload } from "./fight-battle-log";
import { simulateFight, type FightEvent } from "./fight-simulator";
import { evadeChance } from "./fight-defence";
import {
  createState,
  NO_PASSIVE_EFFECTS,
  type Combatant,
  type PassiveEffects,
} from "./fight-state";
import { seededRandom } from "./fight-summary";
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
    rows: fightBattlePayload(setup, events, result).events[0]?.f?.m ?? [],
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

  test("crushes for its share of the main damage once enough of the strike gets through", () => {
    const crushed = (armor: number) =>
      strikesBy(
        fightOf(withPassives({ crush: { value: 10, bound: 40 } }), { armor })
          .events,
        0,
      )[0]?.crushDamage;

    expect(crushed(0)).toBe(100);
    expect(crushed(1500)).toBe(0);
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
