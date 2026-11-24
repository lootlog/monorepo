import type { Profession } from "../../../wiki/src/lib/equipment-set.ts";
import type { EquipmentSlotId } from "../../../wiki/src/lib/equipment-slots.ts";
import type { Combatant } from "../../../wiki/src/lib/fight/fight-state.ts";
import { armorReduced } from "../../../wiki/src/lib/fight/fight-strike.ts";
import {
  fighterProfile,
  toCombatant,
  type FighterProfile,
} from "../../../wiki/src/lib/fight/fighter-profile.ts";
import {
  skillPointsAt,
  wornSkillWeapons,
  type SkillDefinition,
} from "../../../wiki/src/lib/skills/skill-tree.ts";
import { SKILL_TREE as TREE_B } from "../../../wiki/src/lib/skills/trees/b.ts";
import { SKILL_TREE as TREE_H } from "../../../wiki/src/lib/skills/trees/h.ts";
import { SKILL_TREE as TREE_M } from "../../../wiki/src/lib/skills/trees/m.ts";
import { SKILL_TREE as TREE_P } from "../../../wiki/src/lib/skills/trees/p.ts";
import { SKILL_TREE as TREE_T } from "../../../wiki/src/lib/skills/trees/t.ts";
import { SKILL_TREE as TREE_W } from "../../../wiki/src/lib/skills/trees/w.ts";
import { SLOTS, type Build, type Item } from "./items.js";

export const TREES: Record<Profession, readonly SkillDefinition[]> = {
  b: TREE_B,
  h: TREE_H,
  m: TREE_M,
  p: TREE_P,
  t: TREE_T,
  w: TREE_W,
};

const MELEE: ReadonlySet<Profession> = new Set(["w", "p", "b"]);

const UNAVOIDABLE: ReadonlySet<Profession> = new Set(["m"]);

const FAST_ARROW_TIME_SAVED = 0.75;

export type Fighter = FighterProfile;

export const sum = (values: Iterable<number>) => {
  let total = 0;

  for (const value of values) total += value;

  return total;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const average = ({ min, max }: { min: number; max: number }) =>
  (min + max) / 2;

const ARMOR_DESTRUCTION_HITS = 10;

const HEAL_DECAY_PER_TURN = 0.05;

const healPool = (heal: number, turns: number) => {
  const triggers = clamp(Math.floor(turns), 0, 1 / HEAL_DECAY_PER_TURN);

  return (
    heal * (triggers - (HEAL_DECAY_PER_TURN * triggers * (triggers - 1)) / 2)
  );
};

export const createModel = (level: number) => {
  const cappedLevel = Math.min(level, 300);
  const skillPoints = skillPointsAt(level);
  const fighterCache = new Map<string, Fighter>();

  const fighter = (build: Build, extraItems: readonly Item[] = []): Fighter => {
    const key =
      extraItems.length === 0
        ? `${build.profession}|${SLOTS.map((slot) => build.gear[slot]?.uid ?? "-").join(",")}|${JSON.stringify(build.ranks)}`
        : undefined;

    const cached = key === undefined ? undefined : fighterCache.get(key);

    if (cached) return cached;

    const items = [
      ...SLOTS.flatMap((slot) => build.gear[slot] ?? []),
      ...extraItems,
    ];

    const worn = new Map<EquipmentSlotId, { item: Item }>();

    for (const slot of SLOTS) {
      const item = build.gear[slot];

      if (!item) continue;

      // SAFETY: wornSkillWeapons reads the weapon and secondary entries by id and every other entry only by value, so armour slots keyed by item type do not change the result.
      worn.set(slot as EquipmentSlotId, { item });
    }

    const result = fighterProfile({
      profession: build.profession,
      level,
      items: items.map((item) => ({ item })),
      tree: TREES[build.profession],
      ranks: build.ranks,
      weapons: wornSkillWeapons(worn),
    });

    if (key !== undefined) fighterCache.set(key, result);

    return result;
  };

  const attackSpeed = (
    attacker: Fighter,
    defender: Fighter,
    group: boolean,
  ) => {
    const slowPoints = group
      ? Math.max(defender.slowMax, defender.skillSlow)
      : (defender.extra.slowSum ?? 0) + defender.skillSlow;

    const poisonSlow =
      defender.stats.poison.damage > 0 ? defender.stats.poison.slow : 0;

    const slow =
      (slowPoints / 100 + poisonSlow) *
      (1 - (attacker.extra.redslow ?? 0) / 100);

    const critSlow =
      (clamp(
        defender.stats.critChance - (attacker.extra.lowcrit ?? 0),
        1,
        100,
      ) /
        100) *
      ((defender.extra.critslow_per ?? 0) / 100);

    const sa = attacker.stats.attackSpeed;

    return Math.max(0.33 * sa, (sa - slow) * (1 - critSlow));
  };

  const damagePerAttack = (attacker: Fighter, defender: Fighter) => {
    const a = attacker.stats;
    const d = defender.stats;

    const evade = UNAVOIDABLE.has(attacker.profession)
      ? 0
      : Math.min(
          50,
          (Math.max(0, d.evadePoints - (attacker.extra.lowevade ?? 0)) * 20) /
            cappedLevel,
        ) / 100;

    const block = d.blockChance / 100;

    const armor = Math.max(
      0.5 * d.armor,
      d.armor - (attacker.extra.acdmg ?? 0) * ARMOR_DESTRUCTION_HITS,
    );

    const pierce =
      clamp(a.pierce - (defender.extra.pierceb ?? 0), 0, 100) / 100;

    const crit =
      clamp(a.critChance - (defender.extra.lowcrit ?? 0), 1, 100) / 100;

    const physicalCrit = 1 + crit * (a.critValue / 100 - 1);
    const magicCrit = 1 + crit * (a.critMagicValue / 100 - 1);

    const physical =
      average(a.physical) * (1 + (attacker.extra.dmgmulphysical ?? 0) / 100);

    const physicalHit =
      (pierce * physical + (1 - pierce) * armorReduced(physical, armor)) *
        physicalCrit +
      armorReduced(average(a.offhand), armor) * physicalCrit;

    const element = (range: { min: number; max: number }, resistance: number) =>
      armorReduced(average(range), 0.5 * d.armor) *
      magicCrit *
      (1 - clamp(resistance, 0, 90) / 100);

    const elemental =
      element(a.fire, d.resFire) +
      element(a.frost, d.resFrost) +
      element(a.light, d.resLight);

    const poison = 0;

    const wound =
      (a.wound.chance / 100) *
      a.wound.damage *
      (1 - clamp(defender.extra.woundred ?? 0, 0, 90) / 100);

    const modifier =
      (1 + (attacker.extra.dmgmulabsolute ?? 0) / 100) *
      (1 + (defender.extra.dmg_from_player_per ?? 0) / 100);

    const raw = physicalHit + elemental + poison + wound;

    return {
      total: (1 - evade) * (1 - block) * raw * modifier,
      physicalShare: physicalHit / Math.max(1, raw),
      elementalShare: elemental / Math.max(1, raw),
      poisonShare: poison / Math.max(1, raw),
    };
  };

  const duelSide = (attacker: Fighter, defender: Fighter, group: boolean) => {
    const hit = damagePerAttack(attacker, defender);

    const speed =
      attackSpeed(attacker, defender, group) /
      (1 - FAST_ARROW_TIME_SAVED * ((attacker.extra.fastarrow ?? 0) / 100));

    const poisonPerTime =
      attacker.stats.poison.damage *
      (1 - clamp(defender.extra.act ?? 0, 0, 90) / 100) *
      attackSpeed(defender, attacker, group);

    const damagePerTime = Math.max(1e-6, speed * hit.total + poisonPerTime);

    const baseHp =
      defender.stats.hp +
      (MELEE.has(attacker.profession)
        ? defender.stats.absorb * hit.physicalShare
        : 0) +
      defender.stats.absorbMagic * hit.elementalShare;

    const defenderTurns = attackSpeed(defender, attacker, group);
    let timeToKill = baseHp / damagePerTime;

    for (let step = 0; step < 3; step += 1) {
      timeToKill =
        (baseHp +
          healPool(
            Math.max(0, defender.stats.healing - (attacker.extra.adest ?? 0)),
            defenderTurns * timeToKill,
          )) /
        damagePerTime;
    }

    return {
      speed,
      hit: { ...hit, poisonShare: poisonPerTime / damagePerTime },
      damagePerTime,
      timeToKill,
    };
  };

  const combatant = (fighter: Fighter, name: string): Combatant =>
    toCombatant(fighter, name);

  return { cappedLevel, skillPoints, fighter, duelSide, combatant };
};

export type Model = ReturnType<typeof createModel>;
