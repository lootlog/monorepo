import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import { describe, expect, test } from "vitest";
import { fightBattleLog } from "./fight-battle-log";
import { attackTime, simulateFight } from "./fight-simulator";
import { strike } from "./fight-strike";
import type { FightEvent } from "./fight-events";
import { snapshotFighter, type FighterSnapshot } from "./fight-snapshot";
import { groupFightTurns, type RecordedEvent } from "./fight-turns";
import {
  createState,
  NO_LEGENDARY_BONUSES,
  NO_PASSIVE_EFFECTS,
  type Combatant,
} from "./fight-state";
import { fighter, NO_DAMAGE } from "./fight.fixtures";
import {
  addBuff,
  endSkillTurn,
  NO_SKILL,
  type ActiveSkill,
  type MasteryQueue,
} from "./fight-skills";
import { seededRandom, simulateFights } from "./fight-summary";
import { activeSkill, fighterProfile, toCombatant } from "./fighter-profile";
import { SKILL_TREE as WARRIOR_SKILLS } from "@/lib/skills/trees/w";

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

  test("takes a skill's evade reduction from the points above the 50% cap first", () => {
    const feint: ActiveSkill = {
      id: 1,
      name: "zmyłka",
      resource: "energy",
      cost: 0,
      cooldown: 0,
      selfCast: false,
      melee: false,
      attacks: true,
      logged: [],
      effects: new Map([["active_decevade_per", { value: 20, turns: 1 }]]),
    };

    const summary = simulateFights(
      {
        teams: [
          [
            fighter({
              profession: "h",
              hp: 10_000_000,
              mastery: { steps: [feint], repeat: true },
            }),
          ],
          [fighter({ name: "unik", hp: 10_000_000, evadePoints: 2000 })],
        ],
      },
      RUNS,
    );

    expect(summary.fighters[0]?.evadedRate).toBeGreaterThan(0.45);
  });

  test("logs an evaded strike with its strength and no damage taken", () => {
    const setup = {
      teams: [
        [fighter({ profession: "h" })],
        [fighter({ name: "unik", evadePoints: 10_000 })],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(
      setup,
      seededRandom(5),
      (event) => {
        events.push(event);
      },
      true,
    );

    const evadedRows =
      fightBattleLog(setup, events, result).payload.events[0]?.f?.m?.filter(
        (row) => row.includes("-evade"),
      ) ?? [];

    expect(evadedRows.length).toBeGreaterThan(0);
    expect(
      evadedRows.every((row) => /;\+dmgd=[1-9]\d*;.*-evade;-dmgd=0$/.test(row)),
    ).toBe(true);
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

describe("battle mastery", () => {
  const skill = (id: number, name: string, cooldown: number): ActiveSkill => ({
    id,
    name,
    resource: "energy",
    cost: 0,
    cooldown,
    selfCast: false,
    melee: false,
    attacks: true,
    logged: [],
    effects: new Map([["adddmg_physical-perw", { value: 0, turns: 1 }]]),
  });

  const actionsOf = (queue: MasteryQueue, turns: number) => {
    const events: FightEvent[] = [];
    const tough = { hp: 10_000_000, physical: { min: 1, max: 1 } };

    simulateFight(
      {
        teams: [
          [fighter({ ...tough, mastery: queue })],
          [fighter({ ...tough, attackSpeed: 1 })],
        ],
      },
      seededRandom(3),
      (event) => {
        events.push(event);
      },
    );

    const actions: string[] = [];
    let cast: string | null = null;

    for (const event of events) {
      if (event.actor !== 0) continue;

      if (event.kind === "skill") cast = event.skill.name;

      if (event.kind === "strike") {
        actions.push(cast ?? "atak");
        cast = null;
      }
    }

    return actions.slice(0, turns);
  };

  const swing = skill(1, "cios", 0);
  const slam = skill(2, "uderzenie", 2);

  test("takes the queued actions turn by turn and starts over when repeating", () => {
    expect(
      actionsOf({ steps: [swing, "attack", slam], repeat: true }, 7),
    ).toEqual([
      "cios",
      "atak",
      "uderzenie",
      "cios",
      "atak",
      "uderzenie",
      "cios",
    ]);
  });

  test("skips a slot whose skill is cooling down or not learned", () => {
    expect(
      actionsOf({ steps: [slam, null, slam, "attack"], repeat: true }, 5),
    ).toEqual(["uderzenie", "atak", "atak", "uderzenie", "atak"]);
  });

  test("only attacks with an empty queue", () => {
    expect(actionsOf({ steps: [], repeat: true }, 3)).toEqual([
      "atak",
      "atak",
      "atak",
    ]);
  });

  test("spends the whole turn on a skill cast on oneself but strikes after an attack skill", () => {
    const learned = (name: string) => {
      const definition = WARRIOR_SKILLS.find((entry) => entry.name === name);

      if (!definition) throw new Error(`missing skill ${name}`);

      return activeSkill(definition, 1, 300);
    };

    const events: FightEvent[] = [];

    const setup = {
      teams: [
        [
          fighter({
            profession: "w",
            hp: 10_000_000,
            energy: 500,
            mastery: {
              steps: [learned("Kamienna skóra"), learned("Okrzyk bojowy")],
              repeat: false,
            },
          }),
        ],
        [fighter({ hp: 10_000_000, attackSpeed: 1 })],
      ],
    };

    const result = simulateFight(setup, seededRandom(3), (event) => {
      events.push(event);
    });

    expect(
      fightBattleLog(setup, events, result).payload.events[0]?.f?.m?.find(
        (row) => row.includes("tspell=Kamienna skóra"),
      ),
    ).toBe(
      "1=100.00;1=100.00;tspell=Kamienna skóra;skillId=34;resfire_per=30;resfrost_per=30;reslight_per=40;antidote=15;achpp_per=0",
    );

    expect(
      events
        .filter((event) => event.actor === 0)
        .slice(0, 4)
        .map((event) =>
          event.kind === "skill" ? event.skill.name : event.kind,
        ),
    ).toEqual(["Kamienna skóra", "Okrzyk bojowy", "strike", "strike"]);
  });

  test("attacks once a list that does not repeat runs out", () => {
    expect(actionsOf({ steps: [swing, swing], repeat: false }, 4)).toEqual([
      "cios",
      "cios",
      "atak",
      "atak",
    ]);
  });
});

describe("skill effects", () => {
  const skill = (
    name: string,
    effects: Record<string, readonly [value: number, turns: number]>,
    attacks = true,
  ): ActiveSkill => ({
    id: 1,
    name,
    resource: "energy",
    cost: 0,
    cooldown: 0,
    selfCast: false,
    melee: false,
    attacks,
    logged: [],
    effects: new Map(
      Object.entries(effects).map(([key, [value, turns]]) => [
        key,
        { value, turns },
      ]),
    ),
  });

  const fightOf = (mine: Partial<Combatant>, theirs: Partial<Combatant>) => {
    const events: FightEvent[] = [];
    const tough = { hp: 10_000_000, physical: { min: 1000, max: 1000 } };

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

  test("casts a spell skill without attacking in the same turn", () => {
    const barrier = skill("bariera", { lightshield_per: [15, 8] }, false);

    const events = fightOf(
      { mastery: { steps: [barrier, "attack"], repeat: true } },
      {},
    );

    const mine = events.filter((event) => event.actor === 0).slice(0, 3);

    expect(mine.map((event) => event.kind)).toEqual([
      "skill",
      "strike",
      "skill",
    ]);
  });

  test("adds the taken-damage bonus from the damage done before armor", () => {
    const mark = skill("piętno", { "taken_dmg_per-all": [15, 8] }, false);

    const events = fightOf(
      { mastery: { steps: [mark, "attack"], repeat: false } },
      { armor: 600 },
    );

    const [hit] = strikesBy(events, 0);

    expect(hit?.damage.physical).toBeLessThan(1000);
    expect(hit?.takenBonus).toBe(150);
  });

  test("counts the forced turns of a counter towards the defender's debuffs", () => {
    const mark = skill("piętno", { "taken_dmg_per-all": [15, 3] }, false);

    const events = fightOf(
      {
        critChance: 100,
        mastery: { steps: [mark, "attack"], repeat: false },
      },
      { counterChance: 100 },
    );

    const marked = strikesBy(events, 0)
      .slice(0, 6)
      .map((hit) => hit.takenBonus > 0);

    expect(marked).toEqual([true, true, true, false, false, false]);
  });

  test("keeps the forced turns of a counter out of the defender's cooldowns", () => {
    const bash = { ...skill("cios", {}), cooldown: 2 };

    const events = fightOf(
      { critChance: 100 },
      {
        counterChance: 100,
        mastery: { steps: [bash], repeat: true },
      },
    );

    const regularTurns = events.flatMap((event, index) => {
      const previous = events[index - 1];

      if (event.actor !== 1) return [];

      if (event.kind === "skill") return ["skill"];

      if (event.kind !== "strike") return [];

      if (previous?.kind === "skill" && previous.actor === 1) return [];

      if (previous?.kind === "strike" && previous.countered) return [];

      return ["attack"];
    });

    expect(regularTurns.slice(0, 6)).toEqual([
      "skill",
      "attack",
      "attack",
      "skill",
      "attack",
      "attack",
    ]);
  });

  test("heals a quarter of the base share less with every further use", () => {
    const bandage = skill("bandaż", { bandage_per: [10, 1] }, false);

    const events = fightOf(
      {
        hp: 1_000_000,
        attackSpeed: 10,
        mastery: { steps: [bandage], repeat: true },
      },
      { physical: { min: 100_000, max: 100_000 }, attackSpeed: 20 },
    );

    const bandaged = events.flatMap((event) =>
      event.kind === "skill" && event.bandaged > 0 ? [event.bandaged] : [],
    );

    expect(bandaged.slice(0, 3)).toEqual([100_000, 75_000, 50_000]);
  });

  test("takes the next turn from a stunned fighter, who cannot evade meanwhile", () => {
    const blow = skill("ogłuszenie", { stun: [100, 1] });

    const events = fightOf(
      {
        attackSpeed: 2,
        mastery: { steps: [blow, "attack", "attack"], repeat: true },
      },
      { attackSpeed: 1, evadePoints: 10_000 },
    );

    const stunIndex = events.findIndex(
      (event) => event.kind === "strike" && event.actor === 0 && event.stun,
    );

    const nextOfTarget = events
      .slice(stunIndex + 1)
      .find((event) => event.actor === 1 && event.kind !== "skill");

    expect(stunIndex).toBeGreaterThanOrEqual(0);
    expect(nextOfTarget?.kind).toBe("lostTurn");
  });

  test("lets stun reduction bring the lost turn forward instead of the turn after it", () => {
    const blow = skill("ogłuszenie", { stun: [100, 1] });

    const strikesBeforeLostTurn = (stunReduction: number) => {
      const events = fightOf(
        {
          attackSpeed: 2,
          mastery: { steps: [blow, "attack", "attack"], repeat: true },
        },
        { attackSpeed: 1, stunReduction },
      );

      const stunIndex = events.findIndex(
        (event) => event.kind === "strike" && event.actor === 0 && event.stun,
      );

      const lostIndex = events.findIndex(
        (event, index) => index > stunIndex && event.kind === "lostTurn",
      );

      return events
        .slice(stunIndex + 1, lostIndex)
        .filter((event) => event.kind === "strike" && event.actor === 0).length;
    };

    expect(strikesBeforeLostTurn(0)).toBeGreaterThan(0);
    expect(strikesBeforeLostTurn(75)).toBe(0);
  });

  test.each([
    { curse: 0, reply: "strike" },
    { curse: 100, reply: "lostTurn" },
  ])(
    "answers a countered critical hit with a forced turn of the defender ($reply)",
    ({ curse, reply }) => {
      const events = fightOf(
        {
          critChance: 100,
          legendary: { ...NO_LEGENDARY_BONUSES, curse },
        },
        { counterChance: 100, attackSpeed: 1, healing: 100 },
      );

      const mine = events.flatMap((event, index) =>
        event.kind === "strike" && event.actor === 0 ? [index] : [],
      );

      expect(mine.length).toBeGreaterThan(2);

      for (const index of mine.slice(0, 3)) {
        const hit = events[index];
        const forcedTurn = events.slice(index + 1, index + 3);

        expect(hit?.kind === "strike" && hit.countered).toBe(true);

        expect(forcedTurn.map(({ kind, actor }) => ({ kind, actor }))).toEqual([
          { kind: "heal", actor: 1 },
          { kind: reply, actor: 1 },
        ]);
      }
    },
  );

  test("lifts the stun of the very hit that triggers Płomienne oczyszczenie", () => {
    const blow = skill("ogłuszenie", { stun: [100, 1] });

    const events = fightOf(
      { mastery: { steps: [blow], repeat: true } },
      { legendary: { ...NO_LEGENDARY_BONUSES, cleanse: 100 } },
    );

    const stuns = strikesBy(events, 0).filter((event) => event.stun);

    expect(stuns.length).toBeGreaterThan(0);
    expect(stuns.every((event) => event.cleansed)).toBe(true);
    expect(
      events.some((event) => event.kind === "lostTurn" && event.actor === 1),
    ).toBe(false);
  });

  test("stuns a fighter that is immune to damage without hurting it", () => {
    const blow = skill("ogłuszenie", { stun: [100, 1] });
    const calm = skill("spokój", { immunity_to_dmg: [1, 50] }, false);

    const events = fightOf(
      { mastery: { steps: [blow], repeat: true } },
      { attackSpeed: 40, mastery: { steps: [calm], repeat: false } },
    );

    const immune = strikesBy(events, 0).filter((event) => event.immune);

    expect(immune.length).toBeGreaterThan(0);
    expect(immune.every((event) => event.stun)).toBe(true);
    expect(immune.every((event) => event.damage.physical === 0)).toBe(true);
  });

  test("destroys absorption with a skill only when its strike is not evaded", () => {
    const lance = skill("pocisk", { active_absorbdest_per: [10, 1] });

    const strikes = strikesBy(
      fightOf(
        { mastery: { steps: [lance], repeat: true } },
        { evadePoints: 10_000, absorb: 1_000_000, absorbMagic: 1_000_000 },
      ),
      0,
    );

    const destroyed = (evaded: boolean) =>
      strikes
        .filter((event) => event.evaded === evaded)
        .map((event) => event.absorbShareDestroyed.absorbMagic);

    expect(destroyed(true).length).toBeGreaterThan(0);
    expect(destroyed(true).every((amount) => amount === 0)).toBe(true);
    expect(destroyed(false).every((amount) => amount > 0)).toBe(true);
  });

  test("adds up the caster's damage bonuses on flat skill damage, cut by the target's damage reduction and floored", () => {
    const orb = skill("kula", { "dmg-target_absolute": [4350, 1] }, false);

    const events = fightOf(
      {
        allDamageBonus: 3,
        unavoidableBonus: 5,
        mastery: { steps: [orb], repeat: false },
      },
      { damageTakenBonus: -10 },
    );

    const cast = events.find((event) => event.kind === "skill");

    expect(cast?.kind === "skill" && cast.flatDamage).toBe(4228);
  });

  test("adds all damage to the light bonus on light health damage over time and to the unavoidable bonus on unavoidable", () => {
    const shock = skill("porazenie", {
      "dmg_evade_hpp-target_light": [1, 3],
      "dmg_evade_hpp-target": [1, 3],
    });

    const events = fightOf(
      {
        allDamageBonus: 3,
        lightDamageBonus: 10,
        unavoidableBonus: 50,
        mastery: { steps: [shock], repeat: false },
      },
      {},
    );

    const ticks = events.find(
      (event) => event.kind === "damageOverTime" && event.actor === 1,
    );

    expect(
      ticks?.kind === "damageOverTime" &&
        Object.fromEntries(ticks.ticks.map((tick) => [tick.kind, tick.damage])),
    ).toEqual({ light: 113_000, absolute: 153_000 });
  });

  test("destroys the same armor with a crushing skill whether or not the strike crits", () => {
    const crusher = skill("niszczyciel", {
      "active_acdmg_physical-perw": [4, 1],
    });

    const strikes = strikesBy(
      fightOf(
        { critChance: 50, mastery: { steps: [crusher], repeat: true } },
        { armor: 100_000 },
      ),
      0,
    );

    expect(strikes.some((event) => event.crit)).toBe(true);
    expect(strikes.some((event) => !event.crit)).toBe(true);
    expect(new Set(strikes.map((event) => event.armorDestroyed))).toEqual(
      new Set([40]),
    );
  });

  test("gives the Aura ochrony caster half its resistance floored and allies full power", () => {
    const aura: ActiveSkill = {
      ...skill(
        "aura",
        { "aura-ac_per": [20, 8], "aura-resall": [15, 8] },
        false,
      ),
      selfCast: true,
    };

    const fireTaken = (casterLevel: number, allyLevel: number) => {
      const events: FightEvent[] = [];

      simulateFight(
        {
          teams: [
            [
              fighter({
                hp: 10_000_000,
                level: casterLevel,
                attackSpeed: 40,
                resistFire: 20,
                physical: NO_DAMAGE,
                mastery: { steps: [aura], repeat: false },
              }),
              fighter({
                hp: 10_000_000,
                level: allyLevel,
                attackSpeed: 1,
                resistFire: 20,
                physical: NO_DAMAGE,
              }),
            ],
            [
              fighter({
                profession: "m",
                hp: 10_000_000,
                attackSpeed: 10,
                critChance: 0,
                pierce: 100,
                physical: NO_DAMAGE,
                fire: { min: 1000, max: 1000 },
              }),
            ],
          ],
          levelAdvantage: false,
        },
        seededRandom(5),
        (event) => {
          events.push(event);
        },
      );

      return strikesBy(events, 2)[0]?.damage.fire;
    };

    expect(fireTaken(100, 200)).toBe(730);
    expect(fireTaken(200, 100)).toBe(650);
  });

  test("lets a barrier reflect nothing from the blow that kills its holder", () => {
    const attacker = createState(
      fighter({ hp: 1, physical: { min: 100_000, max: 100_000 } }),
      0,
      0,
    );

    const holder = createState(fighter({ hp: 1000 }), 1, 1);

    addBuff(holder, "lightshield_per", 15, 8, 1);

    const hit = strike(attacker, holder, NO_SKILL, seededRandom(5));

    expect(holder.alive).toBe(false);
    expect(hit.reflected).toBe(0);
    expect(attacker.alive).toBe(true);
  });

  test("adds the poison and frost weapon slows of one attacker, each reduced by slow reduction and only frost boosted", () => {
    const state = createState(
      fighter({ attackSpeed: 5, slowReduction: 20 }),
      0,
      0,
    );

    state.poison = {
      damage: 0,
      turnsLeft: 5,
      source: 1,
      slow: 0.5,
      boosted: false,
    };
    state.frostSlow = {
      source: 1,
      slow: 0.4,
      turnsLeft: 3,
      boost: 0.5,
      boostTurnsLeft: 2,
    };

    expect(attackTime(state)).toBeCloseTo(1 / (5 - 0.5 * 0.8 - 0.4 * 1.3));
  });

  test("speeds up a fighter from its next turn on after a critical speed-up, not in the turn that earned it", () => {
    const state = createState(fighter({}), 0, 0);
    const before = attackTime(state);

    addBuff(state, "critsa", 20, 3, 0);
    const earned = attackTime(state);

    endSkillTurn(state);

    expect(earned).toBe(before);
    expect(attackTime(state)).toBeCloseTo(before / 1.2);
  });

  test("keeps a recast speed-up through the turn that recasts it", () => {
    const state = createState(fighter({}), 0, 0);
    const before = attackTime(state);

    addBuff(state, "sa_per", 20, 1, 0);
    endSkillTurn(state);
    addBuff(state, "sa_per", 20, 1, 0);
    const recast = attackTime(state);

    endSkillTurn(state);

    expect(recast).toBeCloseTo(before / 1.2);
    expect(attackTime(state)).toBeCloseTo(before / 1.2);
  });

  test("lets a buff cast on oneself without a strike cover the enemy's next turn", () => {
    const shield: ActiveSkill = {
      ...skill("tarcza", { immunity_to_dmg: [1, 1] }, false),
      selfCast: true,
    };

    const [hit] = strikesBy(
      fightOf(
        { attackSpeed: 1, mastery: { steps: [shield], repeat: false } },
        {},
      ),
      1,
    );

    expect(hit?.immune).toBe(true);
  });

  test("gives a fighter its first turn one attack time into the fight", () => {
    const actors = fightOf({ attackSpeed: 1.8 }, { attackSpeed: 1 })
      .filter((event) => event.kind === "strike")
      .map((event) => event.actor)
      .slice(0, 3);

    expect(actors).toEqual([0, 1, 0]);
  });

  test("adds Tarcza słońca to the heal decay in full on the first heal after the cast", () => {
    const sunShield: ActiveSkill = {
      ...skill("tarcza słońca", { sunshield_per: [48, 5] }, false),
      selfCast: true,
    };

    const heals = fightOf(
      {
        attackSpeed: 1,
        healing: 1000,
        mastery: { steps: [sunShield], repeat: false },
      },
      { physical: { min: 5000, max: 5000 } },
    ).flatMap((event) =>
      event.kind === "heal" && event.actor === 0 ? [event.amount] : [],
    );

    expect(heals.slice(0, 3)).toEqual([1480, 1334, 1188]);
  });

  test("keeps a fallen enemy's healing aura until the end of the fight", () => {
    const heals = (enemyHealing: number) => {
      const events: FightEvent[] = [];

      simulateFight(
        {
          teams: [
            [fighter({ hp: 10_000_000, healing: 1000, attackSpeed: 2 })],
            [
              fighter({
                hp: 10_000_000,
                attackSpeed: 1,
                physical: { min: 5000, max: 5000 },
              }),
              fighter({
                hp: 1,
                level: 1,
                attackSpeed: 1,
                physical: NO_DAMAGE,
                passives: { ...NO_PASSIVE_EFFECTS, enemyHealing },
              }),
            ],
          ],
          levelAdvantage: false,
        },
        seededRandom(5),
        (event) => {
          events.push(event);
        },
      );

      return events.flatMap((event) =>
        event.kind === "heal" && event.actor === 0 ? [event.amount] : [],
      )[0];
    };

    expect(heals(50)).toBe(500);
  });

  test("checks Ostatni ratunek after each damage-over-time tick", () => {
    const events: FightEvent[] = [];

    simulateFight(
      {
        teams: [
          [
            fighter({
              critChance: 0,
              physical: { min: 800, max: 800 },
              poison: { damage: 100, slow: 0 },
              wound: { chance: 100, damage: 100 },
            }),
          ],
          [
            fighter({
              hp: 1000,
              physical: NO_DAMAGE,
              legendary: {
                ...NO_LEGENDARY_BONUSES,
                lastheal: { min: 40, max: 40 },
              },
            }),
          ],
        ],
      },
      seededRandom(5),
      (event) => {
        events.push(event);
      },
    );

    const [ticks] = events.flatMap((event) =>
      event.kind === "damageOverTime" && event.actor === 1 ? [event] : [],
    );

    expect(ticks?.hp[1]).toBe(300);
  });

  test("counters a parry without a critical hit only with Riposta", () => {
    const countered = (parryCounterChance: number) =>
      strikesBy(
        fightOf(
          { profession: "w", critChance: 0 },
          { parryChance: 100, counterChance: 100, parryCounterChance },
        ),
        0,
      ).some((hit) => hit.countered && !hit.crit && !hit.offhandCrit);

    expect(countered(0)).toBe(false);
    expect(countered(100)).toBe(true);
  });

  test("lets the forced turn of a counter use up the critical slow that triggered it", () => {
    const defenderMoves = (critSlow: number) =>
      simulateFight(
        {
          teams: [
            [fighter({ hp: 10_000_000, critChance: 100, critSlow })],
            [fighter({ hp: 10_000_000, counterChance: 100 })],
          ],
        },
        seededRandom(5),
      ).fighters[1]?.moves ?? 0;

    expect(defenderMoves(50)).toBe(defenderMoves(0));
  });

  test("steps forward in the forced turn of a counter until the striker is in reach", () => {
    const events = fightOf(
      { critChance: 100, position: 3 },
      { profession: "w", position: 1, counterChance: 100 },
    );

    const forcedTurns = events.flatMap((event, index) =>
      event.kind === "strike" && event.actor === 0
        ? [events[index + 1]?.kind]
        : [],
    );

    expect(forcedTurns.slice(0, 3)).toEqual(["step", "step", "strike"]);
  });

  test("parries a melee strike to no damage but never a ranged one", () => {
    const parried = (profession: Combatant["profession"]) =>
      strikesBy(fightOf({ profession }, { parryChance: 100 }), 0).every(
        (hit) => hit.parried && hit.damage.physical === 0,
      );

    expect(parried("w")).toBe(true);
    expect(parried("h")).toBe(false);
  });

  test("gives a warrior the counter, rage and armor protection of learned passives", () => {
    const warrior = toCombatant(
      fighterProfile({
        profession: "w",
        level: 300,
        items: [],
        tree: WARRIOR_SKILLS,
        ranks: { 20: 10, 120: 10 },
        weapons: new Set(["2h"]),
        mastery: { actions: [], repeat: false },
      }),
      "wojownik",
    );

    expect([
      warrior.counterChance,
      warrior.rageTurns,
      warrior.armorDestructionReduction,
    ]).toEqual([40, 1, 30]);
  });

  test("raises Krwawa udręka with its item's upgrade and puts a bow on the third position only with arrows", () => {
    const profileOf = (stats: readonly [type: string, stat: string][]) =>
      fighterProfile({
        profession: "h",
        level: 100,
        items: stats.map(([type, stat]) => ({ item: { type, stat } })),
        tree: [],
        ranks: {},
        weapons: new Set(),
        mastery: { actions: [], repeat: false },
      });

    const anguish = (stat: string) =>
      toCombatant(profileOf([["RING", stat]]), "łowca").legendary.anguish
        .damage;

    expect(anguish("legbon=anguish,80;enhancement_upgrade_lvl=5")).toBe(
      anguish("legbon=anguish,90"),
    );
    expect(anguish("legbon=anguish,90")).toBeGreaterThan(
      anguish("legbon=anguish,80"),
    );

    expect(profileOf([["DISTANCE_WEAPON", "dmg=10,20"]]).position).toBe(1);
    expect(
      profileOf([
        ["DISTANCE_WEAPON", "dmg=10,20"],
        ["QUIVER", "dmg=1,2"],
      ]).position,
    ).toBe(3);
  });

  test("lets armor destruction reduction cut the armor an enemy destroys, while the log keeps the full amount", () => {
    const strikeOn = (armorDestructionReduction: number) => {
      const defender = createState(
        fighter({ armor: 5000, armorDestructionReduction }),
        1,
        1,
      );

      const hit = strike(
        createState(fighter({ armorDestruction: 100 }), 0, 0),
        defender,
        NO_SKILL,
        seededRandom(5),
      );

      return { logged: hit.armorDestroyed, lost: defender.armorLost };
    };

    expect(strikeOn(0)).toEqual({ logged: 100, lost: 100 });
    expect(strikeOn(30)).toEqual({ logged: 100, lost: 70 });
  });
});

describe("fightBattleLog", () => {
  test("logs the critical slow on every critical strike, evaded ones included", () => {
    const setup = {
      teams: [
        [fighter({ name: "krytyk", critChance: 50, critSlow: 15 })],
        [fighter({ name: "unik", evadePoints: 400 })],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(
      setup,
      seededRandom(3),
      (event) => {
        events.push(event);
      },
      true,
    );

    const strikeRows =
      fightBattleLog(setup, events, result).payload.events[0]?.f?.m?.filter(
        (row) => row.startsWith("1=") && row.includes("+dmgd="),
      ) ?? [];

    const critRows = strikeRows.filter((row) => row.includes(";+crit;"));

    expect(critRows.some((row) => row.includes("-evade"))).toBe(true);
    expect(
      strikeRows.every(
        (row) =>
          row.includes(";+crit;+critslow_per=15;") === row.includes(";+crit;"),
      ),
    ).toBe(true);
  });

  test("ties every processed log move to the simulated event that wrote it", () => {
    const setup = {
      teams: [
        [
          fighter({
            name: "truciciel",
            hp: 200_000,
            poison: { damage: 500, slow: 0 },
            wound: { chance: 50, damage: 700 },
          }),
        ],
        [fighter({ name: "cel", hp: 200_000, profession: "w" })],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(
      setup,
      seededRandom(5),
      (event) => {
        events.push(event);
      },
      true,
    );

    const { payload, rows } = fightBattleLog(setup, events, result);

    const moves = new BattleProcessor("full").processBattle(
      payload,
    ).parsedMoves;

    const strikeRows = rows.flatMap((row, index) => {
      const event = row.event === null ? null : events[row.event];

      return event?.kind === "strike"
        ? [{ attacker: moves[index]?.attackerId, event }]
        : [];
    });

    expect(moves).toHaveLength(rows.length);
    expect(rows.at(-1)).toEqual({ event: null, at: events.length });
    expect(strikeRows.length).toBeGreaterThan(0);
    expect(
      strikeRows.every(
        ({ attacker, event }) =>
          attacker === String(event.actor + 1) && event.chances !== null,
      ),
    ).toBe(true);
  });

  test("groups a skill with its strikes into one turn and gives a counter its own", () => {
    const doubleShot: ActiveSkill = {
      id: 1,
      name: "podwójny",
      resource: "energy",
      cost: 0,
      cooldown: 0,
      selfCast: false,
      melee: false,
      attacks: true,
      logged: [],
      effects: new Map([["add_attacks", { value: 1, turns: 1 }]]),
    };

    const setup = {
      teams: [
        [
          fighter({
            hp: 1_000_000,
            critChance: 100,
            mastery: { steps: [doubleShot], repeat: true },
          }),
        ],
        [fighter({ hp: 1_000_000, attackSpeed: 1, counterChance: 100 })],
      ],
    };

    const recorded: RecordedEvent[] = [];

    const result = simulateFight(setup, seededRandom(1), (event, _, turn) => {
      recorded.push({ event, turn, after: [] });
    });

    const { turns } = groupFightTurns(
      fightBattleLog(
        setup,
        recorded.map(({ event }) => event),
        result,
      ).rows,
      recorded,
      [],
    );

    const kinds = turns.map((turn) =>
      turn.entries.map(({ event }) =>
        event ? `${event.kind}:${event.actor}` : null,
      ),
    );

    expect(kinds).toContainEqual(["skill:0", "strike:0", "strike:0"]);
    expect(kinds).toContainEqual(["strike:1"]);
  });

  test("shows a skill's cooldown as its own value on the cast and its strike", () => {
    const volley: ActiveSkill = {
      id: 1,
      name: "salwa",
      resource: "energy",
      cost: 0,
      cooldown: 5,
      selfCast: false,
      melee: false,
      attacks: true,
      logged: [],
      effects: new Map(),
    };

    const setup = {
      teams: [
        [
          fighter({
            hp: 1_000_000,
            mastery: { steps: [volley], repeat: true },
          }),
        ],
        [fighter({ hp: 1_000_000, attackSpeed: 1 })],
      ],
    };

    const steps: { event: FightEvent; caster: FighterSnapshot | undefined }[] =
      [];

    simulateFight(setup, seededRandom(1), (event, states) => {
      steps.push({ event, caster: states[0] && snapshotFighter(states[0]) });
    });

    const cast = steps.findIndex(({ event }) => event.kind === "skill");

    expect(
      steps.slice(cast, cast + 2).map(({ caster }) => caster?.cooldowns),
    ).toEqual([[{ name: "salwa", turns: 5 }], [{ name: "salwa", turns: 5 }]]);
  });

  test("shows piercing efficiency once, on the attacker's first strike", () => {
    const piercing = fighter({
      name: "przeszywający",
      hp: 10_000_000,
      physical: { min: 1, max: 1 },
      legendary: { ...NO_LEGENDARY_BONUSES, puncture: 12 },
    });

    const target = (name: string) =>
      fighter({ name, hp: 10_000_000, attackSpeed: 1, physical: NO_DAMAGE });

    const setup = {
      teams: [[piercing], [target("pierwszy"), target("drugi")]],
      targeting: "random" as const,
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(3), (event) => {
      events.push(event);
    });

    const strikes = events.filter(
      (event) => event.kind === "strike" && event.actor === 0,
    );

    const rows = fightBattleLog(setup, events, result).payload.events[0]?.f?.m;

    expect(
      new Set(strikes.map((event) => event.kind === "strike" && event.target))
        .size,
    ).toBe(2);
    expect(
      rows?.filter((row) => row.includes("+legbon_puncture=12")),
    ).toHaveLength(1);
    expect(
      rows?.find((row) => row.startsWith("1=") && row.includes("+dmg")),
    ).toContain("+legbon_puncture=12");
  });

  test("shows a defender's armor destruction reduction once to each attacker that destroys its armor", () => {
    const destroyer = (name: string) =>
      fighter({
        name,
        hp: 10_000_000,
        physical: { min: 1, max: 1 },
        armorDestruction: 50,
      });

    const setup = {
      teams: [
        [destroyer("pierwszy"), destroyer("drugi")],
        [
          fighter({
            name: "chroniony",
            hp: 10_000_000,
            armor: 100_000,
            attackSpeed: 1,
            physical: NO_DAMAGE,
            armorDestructionReduction: 3,
          }),
        ],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(3), (event) => {
      events.push(event);
    });

    const rows = fightBattleLog(setup, events, result).payload.events[0]?.f?.m;

    const shownTo = (attacker: string) =>
      rows?.filter(
        (row) =>
          row.startsWith(`${attacker}=`) && row.includes("-redacdmg_per=-3"),
      ).length;

    expect(shownTo("1")).toBe(1);
    expect(shownTo("2")).toBe(1);
  });

  test("shows a defender's absorption destruction reduction once, on the first strike that destroys its absorption", () => {
    const drain: ActiveSkill = {
      id: 1,
      name: "pchnięcie",
      resource: "energy",
      cost: 0,
      cooldown: 0,
      selfCast: false,
      melee: false,
      attacks: true,
      logged: [],
      effects: new Map([["active_absorbdest_per", { value: 10, turns: 1 }]]),
    };

    const setup = {
      teams: [
        [
          fighter({
            hp: 10_000_000,
            physical: { min: 1, max: 1 },
            mastery: { steps: [drain], repeat: true },
          }),
        ],
        [
          fighter({
            hp: 10_000_000,
            absorb: 100_000,
            attackSpeed: 1,
            physical: NO_DAMAGE,
            absorbDestructionReduction: 60,
          }),
        ],
      ],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(3), (event) => {
      events.push(event);
    });

    const rows = fightBattleLog(setup, events, result).payload.events[0]?.f?.m;

    expect(
      rows?.filter((row) => row.includes("-redabdest_per=60")).length,
    ).toBe(1);
  });

  test("logs a fight that the battle processor reads back with the simulated damage, bonuses and winner", () => {
    const doubleShot: ActiveSkill = {
      id: 97,
      name: "Podwójny strzał",
      resource: "energy",
      cost: 10,
      cooldown: 2,
      selfCast: false,
      melee: false,
      attacks: true,
      logged: [],
      effects: new Map([["add_attacks", { value: 1, turns: 1 }]]),
    };

    const treacherousArrowhead: ActiveSkill = {
      id: 8,
      name: "Zdradziecki grot",
      resource: "energy",
      cost: 0,
      cooldown: 4,
      selfCast: false,
      melee: false,
      attacks: false,
      logged: [],
      effects: new Map([["dmg-target_absolute", { value: 2900, turns: 1 }]]),
    };

    const barrier: ActiveSkill = {
      id: 53,
      name: "Elektryczna bariera",
      resource: "energy",
      cost: 0,
      cooldown: 8,
      selfCast: true,
      melee: false,
      attacks: false,
      logged: [["lightshield", null]],
      effects: new Map([["lightshield_per", { value: 15, turns: 8 }]]),
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
            mastery: {
              steps: [doubleShot, treacherousArrowhead],
              repeat: true,
            },
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
            hasShield: true,
            armor: 800,
            fire: { min: 300, max: 500 },
            mastery: { steps: [barrier, "attack"], repeat: true },
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

    const payload = fightBattleLog(setup, events, result).payload;

    const battle = new BattleProcessor("full").processBattle(payload);

    const overTimeTaken = (actor: number) =>
      events.reduce(
        (total, event) =>
          event.kind === "damageOverTime" && event.actor === actor
            ? event.ticks.reduce(
                (sum, tick) =>
                  ["poison", "wound", "anguish"].includes(tick.kind)
                    ? sum + tick.damage
                    : sum,
                total,
              )
            : total,
        0,
      );

    const [hunter, warrior] = result.fighters;

    expect(battle.outcome.winningTeam).toBe((result.winner ?? -1) + 1);
    expect(
      (battle.warriors[0]?.damageDealtAfterDefensive ?? 0) +
        (battle.warriors[0]?.trueDamageDealt ?? 0),
    ).toBe(hunter?.damageDealt);
    expect(battle.warriors[0]?.damageDealt).toBeGreaterThan(
      hunter?.damageDealt ?? 0,
    );

    const blockedRows = payload.events
      .flatMap((event) => event.f?.m ?? [])
      .filter((row) => row.includes("-blok="))
      .map((row) => ({
        strength: Number(/;\+dmgd=(\d+)/.exec(row)?.[1]),
        blocked: Number(/;-blok=(\d+)/.exec(row)?.[1]),
      }));

    expect(blockedRows.length).toBeGreaterThan(0);
    expect(
      blockedRows.every(
        ({ strength, blocked }) => blocked === Math.round(0.3 * strength),
      ),
    ).toBe(true);
    expect(battle.warriors.map((entry) => entry.damageTaken)).toEqual([
      (warrior?.damageDealt ?? 0) + overTimeTaken(0),
      (hunter?.damageDealt ?? 0) + overTimeTaken(1),
    ]);
    expect(battle.warriors[0]?.spellsUsedMap).toEqual(
      Object.fromEntries(hunter?.skillUses ?? []),
    );

    const countOf = (actor: number, matches: (event: FightEvent) => boolean) =>
      events.filter((event) => event.actor === actor && matches(event)).length;

    const holyTouchHealed = (actor: number) =>
      events.reduce(
        (total, event) =>
          event.kind === "holyTouchHeal" && event.actor === actor
            ? total + event.amount
            : total,
        0,
      );

    const lastHealed = (actor: number) =>
      events.reduce((total, event) => {
        if (event.kind === "damageOverTime") {
          return event.actor === actor ? total + event.lastHeal : total;
        }

        return (event.kind === "strike" || event.kind === "skill") &&
          event.target === actor
          ? total + event.lastHeal
          : total;
      }, 0);

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
        holyTouchHealed(actor),
        lastHealed(actor),
      ]),
    );
  });
});
