import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import type { Profession } from "@/lib/equipment-set";

type SetStat = {
  id: string;
  /** The item stats it adds up; an attribute also counts "all attributes". */
  keys: readonly string[];
  /** The game stores some stats in hundredths, such as attack speed. */
  scale?: number;
  unit?: "%";
};

/**
 * A set's stats as the game's character window groups them: attack,
 * defence, power and the basic attributes, in the window's order.
 */
export const SET_STAT_SECTIONS = [
  {
    id: "attack",
    stats: [
      { id: "sa", keys: ["sa"], scale: 100 },
      { id: "crit", keys: ["crit"], unit: "%" },
      { id: "critval", keys: ["critval"], unit: "%" },
      { id: "critmval", keys: ["critmval"], unit: "%" },
      { id: "pierce", keys: ["pierce"], unit: "%" },
      { id: "dmgmulabsolute", keys: ["dmgmulabsolute"], unit: "%" },
      { id: "acdmg", keys: ["acdmg"] },
      { id: "resdmg", keys: ["resdmg"], unit: "%" },
      { id: "lowevade", keys: ["lowevade"] },
      { id: "slow", keys: ["slow"], scale: 100 },
    ],
  },
  {
    id: "defence",
    stats: [
      { id: "ac", keys: ["ac"] },
      { id: "evade", keys: ["evade"] },
      { id: "blok", keys: ["blok"] },
      { id: "lowcrit", keys: ["lowcrit"], unit: "%" },
      { id: "heal", keys: ["heal"] },
      { id: "absorb", keys: ["absorb"] },
      { id: "absorbm", keys: ["absorbm"] },
      { id: "resfire", keys: ["resfire"], unit: "%" },
      { id: "reslight", keys: ["reslight"], unit: "%" },
      { id: "resfrost", keys: ["resfrost"], unit: "%" },
      { id: "act", keys: ["act"], unit: "%" },
      { id: "manadest", keys: ["manadest"] },
      { id: "endest", keys: ["endest"] },
    ],
  },
  {
    id: "power",
    stats: [
      { id: "manabon", keys: ["manabon"] },
      { id: "energybon", keys: ["energybon"] },
    ],
  },
  {
    id: "basic",
    stats: [
      { id: "hp", keys: ["hp"] },
      { id: "strength", keys: ["ds", "da"] },
      { id: "agility", keys: ["dz", "da"] },
      { id: "intellect", keys: ["di", "da"] },
    ],
  },
] as const satisfies ReadonlyArray<{ id: string; stats: readonly SetStat[] }>;

export type SetStatSection = (typeof SET_STAT_SECTIONS)[number];

export type SetStatDefinition = SetStatSection["stats"][number];

/** Every item stat a set adds up. */
export const SUMMED_STAT_KEYS = [
  ...new Set(
    SET_STAT_SECTIONS.flatMap(({ stats }) => stats.flatMap(({ keys }) => keys)),
  ),
];

export type SummedStatKey = (typeof SUMMED_STAT_KEYS)[number];

export type StatTotals = Partial<Record<SummedStatKey, number>>;

const NUMERIC_VALUE = /^[+-]?\d+(?:\.\d+)?$/;

/** A stat's text value; flags such as `binds` carry none. */
const textValue = (value: string | boolean | undefined) =>
  value === undefined || value === true || value === false ? undefined : value;

/** The sum of each summed stat over the items; a stat no item has is absent. */
export const sumItemStats = (stats: ReadonlyArray<string>): StatTotals => {
  const totals: StatTotals = {};

  for (const stat of stats) {
    for (const { key, value } of parseItemStats(stat)) {
      const text = textValue(value);
      const summedKey = SUMMED_STAT_KEYS.find((summed) => summed === key);

      if (summedKey && text !== undefined && NUMERIC_VALUE.test(text)) {
        totals[summedKey] = (totals[summedKey] ?? 0) + Number(text);
      }
    }
  }

  return totals;
};

export type ItemRequirementIssue = "profession" | "level";

/**
 * What keeps the character from wearing the item: another profession or a
 * higher level. A character without a profession or level meets each check.
 */
export const findRequirementIssues = (
  stat: string,
  character: { profession: Profession | null; level: number | null },
): ItemRequirementIssue[] => {
  const stats = parseItemStats(stat);
  const professions = textValue(stats.find(({ key }) => key === "reqp")?.value);
  const level = Number(stats.find(({ key }) => key === "lvl")?.value);

  return [
    character.profession !== null &&
    professions !== undefined &&
    !professions.includes(character.profession)
      ? ("profession" as const)
      : undefined,
    character.level !== null &&
    Number.isFinite(level) &&
    level > character.level
      ? ("level" as const)
      : undefined,
  ].filter((issue) => issue !== undefined);
};

/**
 * A set stat's value in the game's own units, such as attack speed in whole
 * points; none when no worn item has it.
 */
export const setStatValue = (
  totals: StatTotals,
  stat: SetStatDefinition,
): number | undefined => {
  const parts = stat.keys.flatMap((key) => {
    const total = totals[key];

    return total === undefined ? [] : [total];
  });

  if (parts.length === 0) return undefined;

  const sum = parts.reduce((total, part) => total + part, 0);

  return "scale" in stat ? sum / stat.scale : sum;
};
