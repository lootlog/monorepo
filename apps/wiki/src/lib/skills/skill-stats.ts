import {
  type SetStatDefinition,
  setStatValue,
  type StatTotals,
} from "@/lib/item-stat-totals";
import {
  type SkillDefinition,
  skillPlanLevel,
  type SkillRanks,
  skillRankStats,
  skillState,
  skillValueAt,
  type SkillWeapon,
} from "@/lib/skills/skill-tree";

/**
 * The passive stats learned skills add, by the game's stat name. Only the
 * stats the character window counts: the rest act in combat, on a skill's
 * use or after a hit, and are read from the skill itself.
 */
export type SkillBonuses = ReadonlyMap<string, number>;

const PASSIVE_STATS = new Set([
  "hp",
  "hpbon",
  "ac",
  "ac2_per",
  "manabon",
  "manastr",
  "energybon",
  "managain",
  "energygain",
  "act",
  "sa1",
  "sa-clothes",
  "dmgmulabsolute",
  "agi",
  "str1h",
  "str2h",
  "of-str",
  "firebon",
  "frostbon",
  "lightbon",
  "crit",
  "critval",
  "of-crit",
  "of-critval",
  "of-thirdatt",
  "critmval_f",
  "critmval_c",
  "critmval_l",
  "fastarrow",
  "evade_per",
  "decevade_per",
  "blok_per",
  "combo-block",
  "combo-crit",
  "parry",
  "engback",
  "rage_3turns",
  "absorb_per",
  "absorbm_per",
  "heal1_per",
  "critslow_per",
  "absorbd",
  "pierce",
  "pierceb",
  "resfire",
  "resfrost",
  "reslight",
  "decblock_per",
  "contra",
  "pcontra",
  "arrowblock",
  "healpower",
  "dmg_to_npc_per",
  "dmg_from_npc_per",
  "dmg_from_player_per",
  "redacdmg_per",
  "redabdest_per",
  "reddest_per",
  "heal_per-enemies",
  "redstun",
  "redslow",
  "woundred",
  "absagain_per",
  "woundchance",
  "wounddmgbon_perw",
  "of-wounddmgbon_perw",
]);

// Strength adds damage only through the weapon a stat names.
const WEAPON_BOUND_STATS = new Map<string, SkillWeapon>([
  ["str1h", "1h"],
  ["str2h", "2h"],
  ["of-str", "h"],
]);

/** The game counts these reductions as positive amounts. */
const ABSOLUTE_STATS = new Set(["redacdmg_per", "heal_per-enemies"]);

/**
 * What the learned skills add to the character window. A skill counts once
 * the character reaches its level and wears what it needs.
 */
export const sumSkillBonuses = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  level: number | null,
  weapons: ReadonlySet<SkillWeapon>,
): SkillBonuses => {
  const bonuses = new Map<string, number>();

  for (const skill of tree) {
    const state = skillState(skill, ranks, level, weapons);

    if (state.rank === 0 || state.inactive) continue;

    for (const [key, raw] of skillRankStats(skill, state.rank)) {
      const weapon = WEAPON_BOUND_STATS.get(key);
      const value = skillValueAt(raw, level);

      if (
        !PASSIVE_STATS.has(key) ||
        value === undefined ||
        (weapon && !weapons.has(weapon))
      ) {
        continue;
      }

      bonuses.set(
        key,
        (bonuses.get(key) ?? 0) +
          (ABSOLUTE_STATS.has(key) ? Math.abs(value) : value),
      );
    }
  }

  return bonuses;
};

type Combine = (
  item: number | undefined,
  bonus: (key: string) => number | undefined,
  level: number,
) => number | undefined;

const add = (...parts: Array<number | undefined>) =>
  parts.some((part) => part !== undefined)
    ? parts.reduce<number>((sum, part) => sum + (part ?? 0), 0)
    : undefined;

const scaled = (
  item: number | undefined,
  percent: number | undefined,
  round: (value: number) => number,
) =>
  item === undefined ? undefined : round(item * (1 + (percent ?? 0) / 100));

/** Points a percentage skill adds, as the game converts it at the level. */
const levelPoints = (percent: number | undefined, level: number) =>
  percent === undefined ? undefined : Math.round((percent * level) / 20);

/**
 * How skills change each stat of the window, as the game's character stats
 * combine them: some add, some raise what the items give by a percentage.
 */
const COMBINED_STATS = new Map<string, Combine>(
  Object.entries({
    sa: (item, bonus) => {
      const fromItems = scaled(item, bonus("sa-clothes"), (value) => value);
      const total = add(fromItems, bonus("sa1"));

      return total === undefined ? undefined : total / 100;
    },
    crit: (item, bonus) => add(item, bonus("crit")),
    critval: (item, bonus) => add(item, bonus("critval")),
    pierce: (item, bonus) => add(item, bonus("pierce")),
    dmgmulabsolute: (item, bonus) => add(item, bonus("dmgmulabsolute")),
    lowevade: (item, bonus, level) =>
      add(item, levelPoints(bonus("decevade_per"), level)),
    ac: (item, bonus) =>
      add(scaled(item, bonus("ac2_per"), Math.round), bonus("ac")),
    evade: (item, bonus, level) =>
      add(item, levelPoints(bonus("evade_per"), level)),
    blok: (item, bonus, level) =>
      add(item, levelPoints(bonus("blok_per"), level)),
    heal: (item, bonus) => scaled(item, bonus("heal1_per"), Math.round),
    absorb: (item, bonus) => scaled(item, bonus("absorb_per"), Math.floor),
    absorbm: (item, bonus) => scaled(item, bonus("absorbm_per"), Math.floor),
    resfire: (item, bonus) => add(item, bonus("resfire")),
    reslight: (item, bonus) => add(item, bonus("reslight")),
    resfrost: (item, bonus) => add(item, bonus("resfrost")),
    act: (item, bonus) => add(item, bonus("act")),
    manabon: (item, bonus) => add(item, bonus("manabon")),
    energybon: (item, bonus) => add(item, bonus("energybon")),
    hp: (item, bonus) => add(item, bonus("hp")),
  } satisfies Record<string, Combine>),
);

/** A window stat with the items' total and what skills add to it. */
export const setStatValueWithSkills = (
  totals: StatTotals,
  stat: SetStatDefinition,
  bonuses: SkillBonuses,
  level: number | null,
) => {
  const item = setStatValue(totals, stat);
  const combine = COMBINED_STATS.get(stat.id);

  return combine
    ? combine(item, (key) => bonuses.get(key), skillPlanLevel(level))
    : item;
};

type SkillStat = {
  id: string;
  key: string;
  unit?: "%";
  /** The game stores a share of an attribute as a fraction. */
  percent?: true;
};

/**
 * The stats only skills give, in a section after the window's own: what an
 * attribute adds, chances that act in combat and damage taken or dealt.
 */
export const SKILL_STATS: readonly SkillStat[] = [
  { id: "str1h", key: "str1h", unit: "%", percent: true },
  { id: "str2h", key: "str2h", unit: "%", percent: true },
  { id: "ofStr", key: "of-str", unit: "%", percent: true },
  { id: "agi", key: "agi", unit: "%", percent: true },
  { id: "firebon", key: "firebon", unit: "%", percent: true },
  { id: "frostbon", key: "frostbon", unit: "%", percent: true },
  { id: "lightbon", key: "lightbon", unit: "%", percent: true },
  { id: "hpbon", key: "hpbon" },
  { id: "manastr", key: "manastr" },
  { id: "critmvalFire", key: "critmval_f", unit: "%" },
  { id: "critmvalFrost", key: "critmval_c", unit: "%" },
  { id: "critmvalLight", key: "critmval_l", unit: "%" },
  { id: "ofCrit", key: "of-crit", unit: "%" },
  { id: "ofCritval", key: "of-critval", unit: "%" },
  { id: "ofThirdAttack", key: "of-thirdatt", unit: "%" },
  { id: "parry", key: "parry", unit: "%" },
  { id: "contra", key: "contra", unit: "%" },
  { id: "pcontra", key: "pcontra", unit: "%" },
  { id: "arrowblock", key: "arrowblock", unit: "%" },
  { id: "pierceb", key: "pierceb", unit: "%" },
  { id: "decblock", key: "decblock_per", unit: "%" },
  { id: "fastarrow", key: "fastarrow", unit: "%" },
  { id: "engback", key: "engback", unit: "%" },
  { id: "rage", key: "rage_3turns", unit: "%" },
  { id: "critslow", key: "critslow_per", unit: "%" },
  { id: "comboCrit", key: "combo-crit" },
  { id: "comboBlock", key: "combo-block" },
  { id: "woundchance", key: "woundchance", unit: "%" },
  { id: "wounddmg", key: "wounddmgbon_perw", unit: "%" },
  { id: "ofWounddmg", key: "of-wounddmgbon_perw", unit: "%" },
  { id: "healpower", key: "healpower", unit: "%" },
  { id: "absagain", key: "absagain_per", unit: "%" },
  { id: "absorbd", key: "absorbd", unit: "%" },
  { id: "dmgToNpc", key: "dmg_to_npc_per", unit: "%" },
  { id: "dmgFromNpc", key: "dmg_from_npc_per", unit: "%" },
  { id: "dmgFromPlayer", key: "dmg_from_player_per", unit: "%" },
  { id: "redacdmg", key: "redacdmg_per", unit: "%" },
  { id: "redabdest", key: "redabdest_per", unit: "%" },
  { id: "reddest", key: "reddest_per", unit: "%" },
  { id: "lowheal", key: "heal_per-enemies", unit: "%" },
  { id: "redstun", key: "redstun", unit: "%" },
  { id: "redslow", key: "redslow", unit: "%" },
  { id: "woundred", key: "woundred", unit: "%" },
  { id: "managain", key: "managain" },
  { id: "energygain", key: "energygain" },
];

/** A skill-only stat's value; none when no learned skill gives it. */
export const skillStatValue = (bonuses: SkillBonuses, stat: SkillStat) => {
  const value = bonuses.get(stat.key);

  if (value === undefined) return undefined;

  return stat.percent ? Math.round(value * 10_000) / 100 : value;
};
