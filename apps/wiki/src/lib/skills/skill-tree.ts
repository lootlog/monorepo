import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import type { Profession } from "@/lib/equipment-set";
import type { EquipmentSlotId } from "@/lib/equipment-slots";

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

export type SkillDefinition = {
  id: number;
  name: string;
  description: string;
  level: number;
  maxRank: number;
  active: boolean;
  selfCast?: boolean;
  spell?: boolean;
  melee?: boolean;
  row: number;
  column: number;
  element: "fire" | "frost" | "heal" | "light" | "physical" | "support";
  icon: readonly [number, number];
  weapons: readonly SkillWeapon[];
  ranks: readonly string[];
};

export type SkillRanks = Partial<Record<number, number>>;

const learnedRank = (skill: SkillDefinition, ranks: SkillRanks) =>
  Math.min(ranks[skill.id] ?? 0, skill.maxRank);

export const SKILL_LEVEL_CAP = 300;

const FIRST_POINT_LEVEL = 25;

export const SKILL_TIER_LEVELS = [25, 35, 50, 80, 120, 170, 230] as const;

export const skillPlanLevel = (level: number | null) =>
  Math.min(level ?? SKILL_LEVEL_CAP, SKILL_LEVEL_CAP);

export const skillPointsAt = (level: number | null) =>
  Math.max(0, skillPlanLevel(level) - FIRST_POINT_LEVEL + 1);

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

export const loadSkillTree = (profession: Profession) =>
  TREE_LOADERS[profession]();

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

export const skillValueAt = (raw: string, level: number | null) => {
  const [value = ""] = raw.split("@")[0]?.split("/") ?? [];
  const perLevel = /^(-?\d+(?:\.\d+)?)\*lvl$/.exec(value);

  if (perLevel) {
    return Math.round(Number(perLevel[1]) * skillPlanLevel(level));
  }

  return NUMBER.test(value) ? Number(value) : undefined;
};

export const skillRankStats = (skill: SkillDefinition, rank: number) =>
  parseSkillRank(
    rank > 0 ? (skill.ranks[Math.min(rank, skill.maxRank) - 1] ?? "") : "",
  );

type WornForSkills = ReadonlyMap<
  EquipmentSlotId,
  { item: { type: string | null; stat: string } }
>;

export const wornSkillWeapons = (
  wornItems: WornForSkills,
): ReadonlySet<SkillWeapon> => {
  const weaponType = wornItems.get("weapon")?.item.type;
  const secondaryType = wornItems.get("secondary")?.item.type;

  const has = (weapon: SkillWeapon, isMet: boolean) => (isMet ? [weapon] : []);

  const wornStats = new Set(
    [...wornItems.values()].flatMap(({ item }) =>
      parseItemStatEntries(item.stat).flatMap(({ key, value }) =>
        value === "0" ? [] : [key],
      ),
    ),
  );

  const oneAndHalf = weaponType === "ONE_AND_HALF_HAND_WEAPON";
  const shield = secondaryType === "SHIELD";

  return new Set<SkillWeapon>([
    ...has("1h", weaponType === "ONE_HAND_WEAPON" || (oneAndHalf && shield)),
    ...has("2h", weaponType === "TWO_HAND_WEAPON" || (oneAndHalf && !shield)),
    ...has("bs", oneAndHalf),
    ...has(
      "sw",
      weaponType === "ONE_HAND_WEAPON" ||
        weaponType === "TWO_HAND_WEAPON" ||
        oneAndHalf ||
        secondaryType === "HELP_WEAPON",
    ),
    ...has(
      "dis",
      weaponType === "DISTANCE_WEAPON" && secondaryType === "QUIVER",
    ),
    ...has("orb", secondaryType === "ORB_WEAPON"),
    ...has("sh", shield),
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
  inactive: "level" | "weapons" | null;
  missingWeapons: readonly SkillWeapon[];
};

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

export const spentSkillPoints = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  belowLevel = Number.POSITIVE_INFINITY,
) =>
  tree
    .filter((skill) => skill.level < belowLevel)
    .reduce((sum, skill) => sum + learnedRank(skill, ranks), 0);

const isLearnable = (tree: readonly SkillDefinition[], ranks: SkillRanks) =>
  tree.every(
    (skill) =>
      learnedRank(skill, ranks) === 0 ||
      spentSkillPoints(tree, ranks, skill.level) >=
        tierPointsRequired(skill.level),
  );

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
