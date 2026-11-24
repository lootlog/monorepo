import { sortBy } from "es-toolkit";
import { itemStatValue } from "@lootlog/domain/item-stat";
import { characterStats, type CharacterStats } from "@/lib/character-stats";
import type { Profession } from "@/lib/equipment-set";
import { sumSkillBonuses } from "@/lib/skills/skill-stats";
import {
  skillPlanLevel,
  skillRankStats,
  skillState,
  skillValueAt,
  type SkillDefinition,
  type SkillRanks,
  type SkillWeapon,
} from "@/lib/skills/skill-tree";
import type { Combatant } from "./fight-state";
import {
  SIMULATED_ACTIVE_EFFECTS,
  isSimulatedActive,
  type ActiveSkill,
  type ComboGain,
} from "./fight-skills";

export type FighterItem = { item: { type: string | null; stat: string } };

export type FighterProfile = {
  profession: Profession;
  level: number;
  stats: CharacterStats;
  extra: Record<string, number>;
  skillSlow: number;
  slowMax: number;
  actives: ActiveSkill[];
  ignoredActives: string[];
  comboGain: ComboGain;
};

const EXTRA_ITEM_KEYS = [
  "lowevade",
  "acdmg",
  "lowcrit",
  "dmgmulphysical",
  "pierceb",
  "act",
  "woundred",
  "adest",
];

const EXTRA_SKILL_KEYS = [
  "pierceb",
  "act",
  "woundred",
  "redslow",
  "fastarrow",
  "critslow_per",
  "decevade_per",
  "dmg_from_player_per",
  "dmgmulabsolute",
  "energygain",
];

const COMBO_EVENTS = ["crit", "pierce", "wound", "block"] as const;

const ACTIVE_PRIORITY = [
  "combo_dmg_hpp-target",
  "combo-max",
  "sa_per",
  "add_attacks",
  "adddmg_physical-perw",
  "active_crit",
  "perdmg",
  "energyrestore_per",
  "red-sa",
] as const;

const itemNumber = ({ item }: FighterItem, key: string) => {
  const value = itemStatValue(item.stat, key);
  const number = Number(value?.split(",").at(-1));

  return Number.isFinite(number) ? number : 0;
};

const totalOf = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

const durationOf = (raw: string) => {
  const turns = Number(raw.split("@")[1]);

  return Number.isFinite(turns) && turns > 0 ? turns : 0;
};

export const activeSkill = (
  skill: SkillDefinition,
  rank: number,
  level: number,
): ActiveSkill => {
  const stats = skillRankStats(skill, rank);
  const resource = stats.has("mana") ? "mana" : "energy";
  const longest = Math.max(1, ...[...stats.values()].map(durationOf));

  const effects = new Map(
    [...stats].flatMap(([key, raw]) => {
      const value = SIMULATED_ACTIVE_EFFECTS.has(key)
        ? skillValueAt(raw, level)
        : undefined;

      return value === undefined
        ? []
        : [[key, { value, turns: durationOf(raw) || longest }] as const];
    }),
  );

  return {
    id: skill.id,
    name: skill.name,
    resource,
    cost: skillValueAt(stats.get(resource) ?? "0", level) ?? 0,
    cooldown: skillValueAt(stats.get("cooldown") ?? "0", level) ?? 0,
    effects,
  };
};

const activePriority = (skill: ActiveSkill) => {
  const index = ACTIVE_PRIORITY.findIndex((key) => skill.effects.has(key));

  return index === -1 ? ACTIVE_PRIORITY.length : index;
};

const learnedSkillEffects = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  level: number,
  weapons: ReadonlySet<SkillWeapon>,
) => {
  let skillSlow = 0;
  const actives: ActiveSkill[] = [];
  const ignoredActives: string[] = [];
  const comboGain = { crit: 0, pierce: 0, wound: 0, block: 0 };

  for (const skill of tree) {
    const state = skillState(skill, ranks, level, weapons);

    if (state.rank === 0 || state.inactive) continue;

    const rankStats = skillRankStats(skill, state.rank);

    for (const event of COMBO_EVENTS) {
      comboGain[event] +=
        skillValueAt(rankStats.get(`combo-${event}`) ?? "0", level) ?? 0;
    }

    if (skill.active) {
      const active = activeSkill(skill, state.rank, level);

      if (isSimulatedActive(active)) actives.push(active);
      else ignoredActives.push(skill.name);

      continue;
    }

    const slow = rankStats.get("slow");

    if (slow !== undefined) skillSlow += skillValueAt(slow, level) ?? 0;
  }

  return {
    skillSlow,
    actives: sortBy(actives, [activePriority]),
    ignoredActives,
    comboGain,
  };
};

export const fighterProfile = ({
  profession,
  level,
  items,
  tree,
  ranks,
  weapons,
}: {
  profession: Profession;
  level: number;
  items: readonly FighterItem[];
  tree: readonly SkillDefinition[];
  ranks: SkillRanks;
  weapons: ReadonlySet<SkillWeapon>;
}): FighterProfile => {
  const bonuses = sumSkillBonuses(tree, ranks, level, weapons);
  const learned = learnedSkillEffects(tree, ranks, level, weapons);

  const stats = characterStats(
    profession,
    skillPlanLevel(level),
    items,
    bonuses,
  );

  const extra: Record<string, number> = {};

  for (const key of EXTRA_ITEM_KEYS) {
    extra[key] = totalOf(items.map((item) => itemNumber(item, key)));
  }

  for (const key of EXTRA_SKILL_KEYS) {
    extra[key] = (extra[key] ?? 0) + (bonuses.get(key) ?? 0);
  }

  extra.lowevade =
    (extra.lowevade ?? 0) +
    Math.round(((extra.decevade_per ?? 0) * skillPlanLevel(level)) / 20);

  const slows = items.map((item) => itemNumber(item, "slow"));

  extra.slowSum = totalOf(slows);

  return {
    profession,
    level,
    stats,
    extra,
    skillSlow: learned.skillSlow,
    slowMax: Math.max(0, ...slows),
    actives: learned.actives,
    ignoredActives: learned.ignoredActives,
    comboGain: learned.comboGain,
  };
};

export const toCombatant = (
  profile: FighterProfile,
  name: string,
): Combatant => {
  const { stats, extra } = profile;

  return {
    name,
    profession: profile.profession,
    level: profile.level,
    hp: stats.hp,
    physical: stats.physical,
    offhand: stats.offhand,
    fire: stats.fire,
    frost: stats.frost,
    light: stats.light,
    poison: stats.poison,
    wound: stats.wound,
    attackSpeed: stats.attackSpeed,
    critChance: stats.critChance,
    critValue: stats.critValue,
    critMagicValue: stats.critMagicValue,
    critReduction: extra.lowcrit ?? 0,
    pierce: stats.pierce,
    pierceBlock: extra.pierceb ?? 0,
    armor: stats.armor,
    armorDestruction: extra.acdmg ?? 0,
    evadePoints: stats.evadePoints,
    evadeReduction: extra.lowevade ?? 0,
    blockPoints: stats.blockPoints,
    absorb: stats.absorb,
    absorbMagic: stats.absorbMagic,
    resistFire: stats.resFire,
    resistFrost: stats.resFrost,
    resistLight: stats.resLight,
    resistPoison: extra.act ?? 0,
    resistWound: extra.woundred ?? 0,
    healing: stats.healing,
    healingReduction: extra.adest ?? 0,
    energy: stats.energy,
    energyGain: extra.energygain ?? 0,
    mana: stats.mana,
    physicalBonus: extra.dmgmulphysical ?? 0,
    damageBonus: extra.dmgmulabsolute ?? 0,
    damageTakenBonus: extra.dmg_from_player_per ?? 0,
    enemySlow: ((extra.slowSum ?? 0) + profile.skillSlow) / 100,
    slowReduction: extra.redslow ?? 0,
    fastArrowChance: extra.fastarrow ?? 0,
    critSlow: extra.critslow_per ?? 0,
    comboGain: profile.comboGain,
    actives: profile.actives,
  };
};
