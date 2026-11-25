import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import { describe, expect, test } from "vitest";
import { fightBattlePayload } from "./fight-battle-log";
import { simulateFight, type FightEvent } from "./fight-simulator";
import { NO_LEGENDARY_BONUSES, type Combatant } from "./fight-state";
import {
  NO_MASTERY,
  type ActiveSkill,
  type MasteryQueue,
} from "./fight-skills";
import { seededRandom, simulateFights } from "./fight-summary";
import { activeSkill, fighterProfile, toCombatant } from "./fighter-profile";
import { SKILL_TREE as WARRIOR_SKILLS } from "@/lib/skills/trees/w";

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
  frostSlow: 0,
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
  shieldArmor: 0,
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
  stunReduction: 0,
  counterChance: 0,
  parryChance: 0,
  parryCounterChance: 0,
  rageTurns: 0,
  rageBonus: 0,
  armorDestructionReduction: 0,
  fastArrowChance: 0,
  critSlow: 0,
  comboGain: { crit: 0, pierce: 0, wound: 0, block: 0 },
  mastery: NO_MASTERY,
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

  test("takes a skill's evade reduction from the points above the 50% cap first", () => {
    const feint: ActiveSkill = {
      id: 1,
      name: "zmyłka",
      resource: "energy",
      cost: 0,
      cooldown: 0,
      selfCast: false,
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

    const result = simulateFight(setup, seededRandom(5), (event) => {
      events.push(event);
    });

    const evadedRows =
      fightBattlePayload(setup, events, result).events[0]?.f?.m?.filter((row) =>
        row.includes("-evade"),
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
      fightBattlePayload(setup, events, result).events[0]?.f?.m?.find((row) =>
        row.includes("tspell=Kamienna skóra"),
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

  test("counters a critical hit with an immediate strike of the defender", () => {
    const events = fightOf(
      { critChance: 100 },
      { counterChance: 100, attackSpeed: 1 },
    );

    const mine = events.flatMap((event, index) =>
      event.kind === "strike" && event.actor === 0 ? [index] : [],
    );

    expect(mine.length).toBeGreaterThan(2);

    for (const index of mine.slice(0, 3)) {
      const hit = events[index];
      const reply = events[index + 1];

      expect(hit?.kind === "strike" && hit.countered).toBe(true);
      expect(reply?.kind === "strike" && reply.actor).toBe(1);
    }
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

  test("lets armor destruction reduction cut the armor an enemy destroys", () => {
    const destroyed = (armorDestructionReduction: number) =>
      strikesBy(
        fightOf(
          { armorDestruction: 100 },
          { armor: 5000, armorDestructionReduction },
        ),
        0,
      )[0]?.armorDestroyed;

    expect(destroyed(0)).toBe(100);
    expect(destroyed(30)).toBe(70);
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
      selfCast: false,
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

    const payload = fightBattlePayload(setup, events, result);

    const battle = new BattleProcessor("full").processBattle(payload);

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
