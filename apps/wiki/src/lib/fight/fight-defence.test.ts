import { describe, expect, test } from "vitest";
import { fightBattlePayload } from "./fight-battle-log";
import { simulateFight, type FightEvent } from "./fight-simulator";
import { strike } from "./fight-strike";
import {
  createState,
  NO_LEGENDARY_BONUSES,
  type Combatant,
} from "./fight-state";
import { NO_SKILL, type ActiveSkill } from "./fight-skills";
import { seededRandom } from "./fight-summary";
import { fighter, NO_DAMAGE } from "./fight.fixtures";

describe("damage and defence", () => {
  const eventsOf = (mine: Partial<Combatant>, theirs: Partial<Combatant>) => {
    const events: FightEvent[] = [];
    const tough = { hp: 10_000_000, physical: NO_DAMAGE };

    simulateFight(
      {
        teams: [
          [fighter({ ...tough, ...mine })],
          [fighter({ ...tough, attackSpeed: 1, ...theirs })],
        ],
      },
      seededRandom(5),
      (event) => {
        events.push(event);
      },
    );

    return events;
  };

  const strikesBy = (events: readonly FightEvent[], actor: number) =>
    events.flatMap((event) =>
      event.kind === "strike" && event.actor === actor ? [event] : [],
    );

  const mage = {
    profession: "m" as const,
    position: 2 as const,
    frost: { min: 10_000, max: 10_000 },
  };

  test("absorbs magic before resistances, as the logs' taken-to-absorbed ratio shows", () => {
    const [hit] = strikesBy(
      eventsOf(mage, { absorbMagic: 2000, resistFrost: 50 }),
      0,
    );

    expect(hit?.damage.frost).toBe(4000);
    expect(hit?.absorbedMagic).toBe(2000);
  });

  test("slows with a frost weapon for three of the target's turns", () => {
    const attacker = createState(
      fighter({ ...mage, frostSlow: 0.5, hp: 10_000_000 }),
      0,
      0,
    );

    const defender = createState(fighter({ hp: 10_000_000 }), 1, 1);

    strike(attacker, defender, NO_SKILL, seededRandom(5));

    expect(defender.frostSlow?.turnsLeft).toBe(3);
  });

  test("lets an armor pierce skip armor for magic damage too", () => {
    const frostTaken = (pierce: number) =>
      strikesBy(eventsOf({ ...mage, pierce }, { armor: 5000 }), 0)[0]?.damage
        .frost;

    expect(frostTaken(0)).toBeLessThan(10_000);
    expect(frostTaken(100)).toBe(10_000);
  });

  test("lowers resistances with every hit until they reach zero", () => {
    const taken = strikesBy(
      eventsOf({ ...mage, resistanceDestruction: 10 }, { resistFrost: 25 }),
      0,
    ).map((hit) => hit.damage.frost);

    expect(taken.slice(0, 4)).toEqual([8500, 9500, 10_000, 10_000]);
  });

  test("adds crit chance for a level lead beyond five levels", () => {
    const critRate = (level: number) => {
      const hits = strikesBy(
        eventsOf(
          { physical: { min: 1, max: 1 }, critChance: 10, level },
          { level: 200 },
        ),
        0,
      );

      return hits.filter((hit) => hit.crit).length / hits.length;
    };

    expect(critRate(200)).toBeLessThan(0.2);
    expect(critRate(225)).toBeGreaterThan(0.6);
  });

  test("drains the attacker's energy with the defender's item and logs it on the strike", () => {
    const setup = {
      teams: [
        [fighter({ hp: 10_000_000, energy: 300 })],
        [
          fighter({
            hp: 10_000_000,
            attackSpeed: 1,
            energyDrain: { chance: 100, amount: 13 },
          }),
        ],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(5), (event) => {
      events.push(event);
    });

    const [first] = strikesBy(events, 0);

    expect(first?.energyDrained.amount).toBe(13);
    expect(
      fightBattlePayload(setup, events, result).events[0]?.f?.m?.some((row) =>
        row.includes("-endest=13"),
      ),
    ).toBe(true);
  });

  test("takes two turns after a curse lands with a stun", () => {
    const blow: ActiveSkill = {
      id: 1,
      name: "ogłuszenie",
      resource: "energy",
      cost: 0,
      cooldown: 50,
      selfCast: false,
      attacks: true,
      logged: [],
      effects: new Map([["stun", { value: 100, turns: 1 }]]),
    };

    const events = eventsOf(
      {
        physical: { min: 1, max: 1 },
        attackSpeed: 1,
        mastery: { steps: [blow], repeat: false },
        legendary: { ...NO_LEGENDARY_BONUSES, curse: 100 },
      },
      { physical: { min: 1, max: 1 }, attackSpeed: 3 },
    );

    const stunned = events.findIndex(
      (event) => event.kind === "strike" && event.actor === 0 && event.stun,
    );

    const nextOwnStrike = events.findIndex(
      (event, index) =>
        index > stunned && event.kind === "strike" && event.actor === 0,
    );

    expect(
      events
        .slice(stunned + 1, nextOwnStrike)
        .filter((event) => event.actor === 1)
        .map((event) => event.kind)
        .filter((kind) => kind !== "heal"),
    ).toEqual(["lostTurn", "lostTurn"]);
  });

  test("restores health to the rolled share when the last resort triggers", () => {
    const events = eventsOf(
      { physical: { min: 9000, max: 9000 } },
      {
        hp: 10_000,
        legendary: { ...NO_LEGENDARY_BONUSES, lastheal: { min: 40, max: 40 } },
      },
    );

    const healed = strikesBy(events, 0).find((hit) => hit.lastHeal > 0);

    expect(healed?.hp[1]).toBe(4000);
  });

  test("shows the defender's care facade once although it cuts every hit", () => {
    const hits = strikesBy(
      eventsOf(
        { physical: { min: 1000, max: 1000 } },
        { legendary: { ...NO_LEGENDARY_BONUSES, facade: 13 } },
      ),
      0,
    );

    expect(hits.filter((hit) => hit.facade > 0)).toHaveLength(1);
    expect(
      hits
        .filter((hit) => !hit.crit)
        .every((hit) => hit.damage.physical === 870),
    ).toBe(true);
  });

  test("counters only the last of several attacks in a turn", () => {
    const doubleHit: ActiveSkill = {
      id: 1,
      name: "podwójne trafienie",
      resource: "energy",
      cost: 0,
      cooldown: 0,
      selfCast: false,
      attacks: true,
      logged: [],
      effects: new Map([["add_attacks", { value: 1, turns: 1 }]]),
    };

    const events = eventsOf(
      {
        physical: { min: 1, max: 1 },
        critChance: 100,
        mastery: { steps: [doubleHit], repeat: true },
      },
      { counterChance: 100 },
    );

    const hits = strikesBy(events, 0);

    expect(hits.length).toBeGreaterThan(3);
    expect(hits.map((hit) => hit.countered).slice(0, 2)).toEqual([false, true]);
  });
});
