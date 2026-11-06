import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import type { Profession } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";

/** What a skill needs worn to work, as the game's `reqw` names it. */
export type SkillWeapon =
  | "1h"
  | "2h"
  | "bs"
  | "dis"
  | "fire"
  | "frost"
  | "h"
  | "light"
  | "orb"
  | "poison"
  | "sh"
  | "sw"
  | "wound";

/**
 * One skill of a profession's tree. Each rank is the game's stat string for
 * it, such as `crit=4;hp=3*lvl`, where `*lvl` scales with the character's
 * level up to 300.
 */
export type SkillDefinition = {
  id: number;
  name: string;
  description: string;
  /** The character level the skill unlocks at. */
  level: number;
  maxRank: number;
  /** Whether it adds an action to combat; a passive one only adds stats. */
  active: boolean;
  /** The tree's tier, from 0 at level 25 to 6 at level 230. */
  row: number;
  column: number;
  element: "fire" | "frost" | "heal" | "light" | "physical" | "support";
  /** The skill's place in the game's icon sprite. */
  icon: readonly [number, number];
  weapons: readonly SkillWeapon[];
  ranks: readonly string[];
};

export type SkillRanks = Partial<Record<number, number>>;

/** The ranks a skill holds, up to its maximum. */
const learnedRank = (skill: SkillDefinition, ranks: SkillRanks) =>
  Math.min(ranks[skill.id] ?? 0, skill.maxRank);

export const SKILL_LEVEL_CAP = 300;

/** The first level with a skill point; every level after it adds one. */
const FIRST_POINT_LEVEL = 25;

/** The tiers of the tree, from the first one, by the level they unlock at. */
export const SKILL_TIER_LEVELS = [25, 35, 50, 80, 120, 170, 230] as const;

/** The level skills are planned for: the character's, or the cap when unset. */
export const skillPlanLevel = (level: number | null) =>
  Math.min(level ?? SKILL_LEVEL_CAP, SKILL_LEVEL_CAP);

/** The skill points a character of the level has; none below level 25. */
export const skillPointsAt = (level: number | null) =>
  Math.max(0, skillPlanLevel(level) - FIRST_POINT_LEVEL + 1);

/**
 * The points the tree must already hold before a tier opens: each tier asks
 * for as many as levels passed since the first one.
 */
export const tierPointsRequired = (tierLevel: number) =>
  Math.max(0, tierLevel - FIRST_POINT_LEVEL);

const TREE_LOADERS: Record<
  Profession,
  () => Promise<readonly SkillDefinition[]>
> = {
  b: () => import("./trees/b").then(({ SKILL_TREE }) => SKILL_TREE),
  h: () => import("./trees/h").then(({ SKILL_TREE }) => SKILL_TREE),
  m: () => import("./trees/m").then(({ SKILL_TREE }) => SKILL_TREE),
  p: () => import("./trees/p").then(({ SKILL_TREE }) => SKILL_TREE),
  t: () => import("./trees/t").then(({ SKILL_TREE }) => SKILL_TREE),
  w: () => import("./trees/w").then(({ SKILL_TREE }) => SKILL_TREE),
};

/** A profession's tree; each is its own chunk, loaded when a set needs it. */
export const loadSkillTree = (profession: Profession) =>
  TREE_LOADERS[profession]();

/** A rank's stats by name, as the game writes them. */
export const parseSkillRank = (rank: string) =>
  new Map(
    rank.split(";").flatMap((token) => {
      const separator = token.indexOf("=");

      return separator > 0
        ? [[token.slice(0, separator), token.slice(separator + 1)] as const]
        : [];
    }),
  );

const NUMBER = /^-?\d+(?:\.\d+)?$/;

/**
 * A rank value as a number at the level: the part before turns (`@3`) and
 * before a second value (`/40`), with `*lvl` scaled by the level the game
 * rounds it at. None for values that are not numbers.
 */
export const skillValueAt = (raw: string, level: number | null) => {
  const [value = ""] = raw.split("@")[0]?.split("/") ?? [];
  const perLevel = /^(-?\d+(?:\.\d+)?)\*lvl$/.exec(value);

  if (perLevel) {
    return Math.round(Number(perLevel[1]) * skillPlanLevel(level));
  }

  return NUMBER.test(value) ? Number(value) : undefined;
};

/** The skill's stats at a rank; none before its first one. */
export const skillRankStats = (skill: SkillDefinition, rank: number) =>
  parseSkillRank(
    rank > 0 ? (skill.ranks[Math.min(rank, skill.maxRank) - 1] ?? "") : "",
  );

type WornForSkills = ReadonlyMap<
  EquipmentSlotId,
  { item: { type: string | null; stat: string } }
>;

/** The requirements the worn items meet, in the game's `reqw` terms. */
export const wornSkillWeapons = (
  wornItems: WornForSkills,
): ReadonlySet<SkillWeapon> => {
  const weaponType = wornItems.get("weapon")?.item.type;
  const secondaryType = wornItems.get("secondary")?.item.type;

  const has = (weapon: SkillWeapon, isMet: boolean) => (isMet ? [weapon] : []);

  const wornStats = new Set(
    [...wornItems.values()].flatMap(({ item }) =>
      parseItemStats(item.stat).flatMap(({ key, value }) =>
        value === undefined || value === false || value === "0" ? [] : [key],
      ),
    ),
  );

  return new Set<SkillWeapon>([
    ...has("1h", weaponType === "ONE_HAND_WEAPON"),
    ...has("2h", weaponType === "TWO_HAND_WEAPON"),
    ...has("bs", weaponType === "ONE_AND_HALF_HAND_WEAPON"),
    ...has(
      "sw",
      weaponType === "ONE_HAND_WEAPON" ||
        weaponType === "TWO_HAND_WEAPON" ||
        weaponType === "ONE_AND_HALF_HAND_WEAPON" ||
        secondaryType === "HELP_WEAPON",
    ),
    // A bow shoots only with arrows.
    ...has(
      "dis",
      weaponType === "DISTANCE_WEAPON" && secondaryType === "QUIVER",
    ),
    ...has("orb", secondaryType === "ORB_WEAPON"),
    ...has("sh", secondaryType === "SHIELD"),
    ...has("h", secondaryType === "HELP_WEAPON"),
    ...has("fire", wornStats.has("fire")),
    ...has("frost", wornStats.has("frost")),
    ...has("light", wornStats.has("light")),
    ...has("poison", wornStats.has("poison")),
    ...has("wound", wornStats.has("wound")),
  ]);
};

export type SkillState = {
  rank: number;
  /** Why the skill's stats do not count: too low a level, or gear it lacks. */
  inactive: "level" | "weapons" | null;
  missingWeapons: readonly SkillWeapon[];
};

/** How a learned skill stands with the character and the worn items. */
export const skillState = (
  skill: SkillDefinition,
  ranks: SkillRanks,
  level: number | null,
  weapons: ReadonlySet<SkillWeapon>,
): SkillState => {
  const rank = learnedRank(skill, ranks);

  const missingWeapons = skill.weapons.filter((weapon) => !weapons.has(weapon));

  return {
    rank,
    inactive:
      skillPlanLevel(level) < skill.level
        ? "level"
        : missingWeapons.length > 0
          ? "weapons"
          : null,
    missingWeapons,
  };
};

/** Points spent on the tree's skills, below a level when one is given. */
export const spentSkillPoints = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  belowLevel = Number.POSITIVE_INFINITY,
) =>
  tree
    .filter((skill) => skill.level < belowLevel)
    .reduce((sum, skill) => sum + learnedRank(skill, ranks), 0);

// The rest of the tree stays learnable in some order while every tier that
// holds learned skills keeps the points spent below it that it asks for.
const isLearnable = (tree: readonly SkillDefinition[], ranks: SkillRanks) =>
  tree.every(
    (skill) =>
      learnedRank(skill, ranks) === 0 ||
      spentSkillPoints(tree, ranks, skill.level) >=
        tierPointsRequired(skill.level),
  );

/**
 * The ranks a skill can move between. It rises as the game lets it be
 * learned: with free points, at its level, and once as many points are spent
 * as its tier asks for. It falls as far as the rest of the tree stays
 * learnable; a tree that no longer is, as a lower level leaves it, can drop
 * every rank.
 */
export const skillRankRange = (
  tree: readonly SkillDefinition[],
  skill: SkillDefinition,
  ranks: SkillRanks,
  level: number | null,
) => {
  const rank = learnedRank(skill, ranks);
  const spent = spentSkillPoints(tree, ranks);

  const canLearn =
    skillPlanLevel(level) >= skill.level &&
    spent >= tierPointsRequired(skill.level);

  const max = canLearn
    ? Math.min(skill.maxRank, rank + Math.max(0, skillPointsAt(level) - spent))
    : rank;

  let min = rank;

  if (!isLearnable(tree, ranks)) min = 0;

  while (min > 0 && isLearnable(tree, { ...ranks, [skill.id]: min - 1 })) {
    min -= 1;
  }

  return { min, max };
};
