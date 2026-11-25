import { describe, expect, test } from "vitest";
import { fightBattleLog } from "./fight-battle-log";
import { simulateFight } from "./fight-simulator";
import type { FightEvent } from "./fight-events";
import { strike } from "./fight-strike";
import {
  createState,
  NO_LEGENDARY_BONUSES,
  type Combatant,
} from "./fight-state";
import { tickDamageOverTime } from "./fight-damage-over-time";
import { weakeningFactor } from "./fight-hit-effects";
import {
  addBuff,
  NO_SKILL,
  type ActionPlan,
  type ActiveSkill,
} from "./fight-skills";
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

  test.each([
    { case: "takes frost damage", armor: 0 },
    { case: "takes no frost damage", armor: 1_000_000 },
  ])(
    "slows with a frost weapon for three of the target's turns when it $case",
    ({ armor }) => {
      const attacker = createState(
        fighter({ ...mage, frostSlow: 0.5, hp: 10_000_000 }),
        0,
        0,
      );

      const defender = createState(fighter({ hp: 10_000_000, armor }), 1, 1);
      const hit = strike(attacker, defender, NO_SKILL, seededRandom(5));

      expect(hit.damage.frost === 0).toBe(armor > 0);
      expect(defender.frostSlow?.turnsLeft).toBe(3);
    },
  );

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

  test("blocks only with a shield worn", () => {
    const blocks = (hasShield: boolean) =>
      strikesBy(
        eventsOf(
          { profession: "w", physical: { min: 1000, max: 1000 } },
          { profession: "w", blockPoints: 10_000, hasShield },
        ),
        0,
      ).some((hit) => hit.blocked > 0);

    expect(blocks(true)).toBe(true);
    expect(blocks(false)).toBe(false);
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

  test("keeps crit chance unchanged by a level lead when the level advantage is off", () => {
    const hits: boolean[] = [];

    simulateFight(
      {
        teams: [
          [
            fighter({
              hp: 10_000_000,
              physical: { min: 1, max: 1 },
              critChance: 10,
              level: 225,
            }),
          ],
          [
            fighter({
              hp: 10_000_000,
              physical: NO_DAMAGE,
              attackSpeed: 1,
              level: 200,
            }),
          ],
        ],
        levelAdvantage: false,
      },
      seededRandom(5),
      (event) => {
        if (event.kind === "strike" && event.actor === 0) hits.push(event.crit);
      },
    );

    expect(hits.filter(Boolean).length / hits.length).toBeLessThan(0.2);
  });

  test.each([
    { drainResist: 0, drained: 13 },
    { drainResist: 4, drained: 9 },
  ])(
    "drains $drained energy past $drainResist of cursed resistance and logs it on the strike",
    ({ drainResist, drained }) => {
      const setup = {
        teams: [
          [
            fighter({
              hp: 10_000_000,
              energy: 300,
              drainResist: { mana: 0, energy: drainResist },
            }),
          ],
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

      expect(first?.energyDrained.amount).toBe(drained);
      expect(
        fightBattleLog(setup, events, result).payload.events[0]?.f?.m?.some(
          (row) => row.includes(`-endest=${drained}`),
        ),
      ).toBe(true);
    },
  );

  test("adds the auxiliary weapon's poison and wound to the main weapon's on one hit, halving a wound that lands with poison", () => {
    const attacker = createState(
      fighter({
        profession: "b",
        hp: 10_000_000,
        offhand: { min: 500, max: 500 },
        poison: { damage: 300, slow: 0.5 },
        offhandPoison: { damage: 200, slow: 0.8 },
        wound: { chance: 100, damage: 400 },
        offhandWound: { chance: 100, damage: 200 },
      }),
      0,
      0,
    );

    const defender = createState(fighter({ hp: 10_000_000 }), 1, 1);
    const hit = strike(attacker, defender, NO_SKILL, seededRandom(5));

    expect(hit.wounds).toMatchObject({
      main: true,
      offhand: true,
      halved: true,
    });
    expect(defender.poison).toMatchObject({ damage: 500, slow: 0.8 });
    expect(defender.wound).toMatchObject({ damage: 300, cap: 1200 });
  });

  test("caps a refreshed wound's remaining duration at five turns", () => {
    const attacker = createState(
      fighter({
        hp: 10_000_000,
        physical: { min: 500, max: 500 },
        wound: { chance: 100, damage: 400 },
      }),
      0,
      0,
    );

    const defender = createState(fighter({ hp: 10_000_000 }), 1, 1);

    strike(attacker, defender, NO_SKILL, seededRandom(5));
    expect(defender.wound?.turnsLeft).toBe(5);

    strike(attacker, defender, NO_SKILL, seededRandom(5));
    expect(defender.wound?.turnsLeft).toBe(5);

    if (defender.wound) defender.wound.turnsLeft = 4;

    strike(attacker, defender, NO_SKILL, seededRandom(5));
    expect(defender.wound?.turnsLeft).toBe(5);

    if (defender.wound) defender.wound.turnsLeft = 2;

    strike(attacker, defender, NO_SKILL, seededRandom(5));
    expect(defender.wound?.turnsLeft).toBe(4);
  });

  test("cuts the struck enemy's item healing for its next two turns", () => {
    const healsOf = (enemyHealingCut: number) =>
      eventsOf(
        { physical: { min: 1000, max: 1000 }, enemyHealingCut },
        { healing: 1000 },
      ).flatMap((event) =>
        event.kind === "heal" && event.actor === 1 ? [event.amount] : [],
      );

    expect(healsOf(0)[0]).toBe(1000);
    expect(healsOf(300)[0]).toBe(700);
  });

  test("lowers the attacker's crit strength by the defender's cursed reduction", () => {
    const critStrength = (critValueReduction: number) =>
      strikesBy(
        eventsOf(
          { physical: { min: 1000, max: 1000 }, critChance: 100 },
          { critValueReduction },
        ),
        0,
      )[0]?.strength.physical;

    expect(critStrength(0)).toBe(1200);
    expect(critStrength(20)).toBe(1000);
  });

  test("takes the defender's cursed armor protection off the item's armor destruction", () => {
    const [hit] = strikesBy(
      eventsOf(
        { physical: { min: 1000, max: 1000 }, armorDestruction: 100 },
        { armor: 5000, armorDestructionResist: 40 },
      ),
      0,
    );

    expect(hit?.armorDestroyed).toBe(60);
    expect(hit?.armorDestructionResisted).toBe(40);
  });

  test("takes two turns after a curse lands with a stun", () => {
    const blow: ActiveSkill = {
      id: 1,
      name: "ogłuszenie",
      resource: "energy",
      cost: 0,
      cooldown: 50,
      selfCast: false,
      melee: false,
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
      { physical: { min: 1, max: 1 }, attackSpeed: 2.4 },
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
      melee: false,
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

  test("ticks injure and critwound at their applied value, cut only by wound resistance", () => {
    const defender = createState(
      fighter({ hp: 100_000, damageTakenBonus: -10, resistWound: 30 }),
      1,
      1,
    );

    const attacker = createState(fighter({}), 0, 0);

    defender.injure = { damage: 1000, turnsLeft: 3, source: 0 };
    defender.critWound = { damage: 2000, turnsLeft: 3, source: 0 };

    expect(
      tickDamageOverTime(defender, [attacker, defender]).map(
        (tick) => tick.damage,
      ),
    ).toEqual([700, 1400]);
  });

  test("pools each poisoning enemy's weakening as its own source within the two-source cap", () => {
    const attacker = createState(fighter({}), 0, 0);
    const defender = createState(fighter({ damageTakenBonus: -10 }), 1, 1);

    attacker.poison = {
      damage: 100,
      slow: 0,
      turnsLeft: 5,
      source: 1,
      boosted: false,
    };
    addBuff(attacker, "poison_lowdmg_per", 10, Infinity, 1);
    addBuff(attacker, "poison_lowdmg_per", 10, Infinity, 2);

    expect(weakeningFactor(attacker, defender)).toBeCloseTo(0.8);
  });

  test("enrages a defender immune to damage after a critical hit", () => {
    const attacker = createState(
      fighter({ critChance: 100, physical: { min: 1000, max: 1000 } }),
      0,
      0,
    );

    const defender = createState(fighter({ rageTurns: 1 }), 1, 1);

    addBuff(defender, "immunity_to_dmg", 1, 2, 1);
    strike(attacker, defender, NO_SKILL, seededRandom(5));

    expect(defender.buffs.some((buff) => buff.key === "rage")).toBe(true);
  });

  test("raises the lightning stacks of a cumulating skill before its own strike", () => {
    const attacker = createState(
      fighter({
        profession: "m",
        critChance: 0,
        physical: NO_DAMAGE,
        light: { min: 1000, max: 1000 },
      }),
      0,
      0,
    );

    const defender = createState(fighter({ hp: 10_000_000 }), 1, 1);

    const shock: ActionPlan = {
      ...NO_SKILL,
      effect: (key) => (key === "active_add_light_cumulaction" ? 1 : 0),
    };

    strike(attacker, defender, NO_SKILL, seededRandom(5));

    expect(
      strike(attacker, defender, shock, seededRandom(5)).strength.light,
    ).toBe(1050);
  });

  test("never parries the auxiliary weapon after the main weapon is evaded", () => {
    const random = seededRandom(5);

    const attacker = createState(
      fighter({ profession: "b", offhand: { min: 500, max: 500 } }),
      0,
      0,
    );

    const defender = createState(
      fighter({ hp: 10_000_000, evadePoints: 100_000, parryChance: 100 }),
      1,
      1,
    );

    const hits = Array.from({ length: 40 }, () =>
      strike(attacker, defender, NO_SKILL, random),
    );

    expect(hits.some((hit) => hit.evaded)).toBe(true);
    expect(hits.filter((hit) => hit.evaded && hit.parried)).toEqual([]);
  });

  test("swings only at enemies the striker reaches without stepping", () => {
    const attacker = createState(
      fighter({ profession: "w", swingChance: 100 }),
      0,
      0,
    );

    const defender = createState(fighter({ hp: 10_000_000 }), 1, 1);
    const near = createState(fighter({ hp: 10_000_000 }), 1, 2);

    const far = createState(
      fighter({ hp: 10_000_000, profession: "h", position: 3 }),
      1,
      3,
    );

    const hit = strike(attacker, defender, NO_SKILL, seededRandom(5), [
      near,
      far,
    ]);

    expect(hit.swings.map((swing) => swing.target)).toEqual([2]);
  });
});
