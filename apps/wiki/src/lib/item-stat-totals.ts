import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import type { Profession } from "@/lib/equipment-set";

/** Stats a set adds up, in the order its summary lists them. */
export const SUMMED_STAT_KEYS = [
  "hp",
  "ac",
  "da",
  "ds",
  "dz",
  "di",
  "crit",
  "critval",
  "sa",
  "evade",
  "blok",
  "pierce",
  "absorb",
  "energybon",
  "manabon",
  "heal",
] as const;

export type StatTotals = Partial<
  Record<(typeof SUMMED_STAT_KEYS)[number], number>
>;

const NUMERIC_VALUE = /^[+-]?\d+(?:\.\d+)?$/;

/** A stat's text value; flags such as `binds` carry none. */
const textValue = (value: string | boolean | undefined) =>
  value === undefined || value === true || value === false ? undefined : value;

/** The sum of each summed stat over the items; a stat no item has is absent. */
export const sumItemStats = (stats: ReadonlyArray<string>): StatTotals => {
  const totals: StatTotals = {};

  for (const stat of stats) {
    for (const { key, value } of parseItemStats(stat)) {
      const summedKey = SUMMED_STAT_KEYS.find((summed) => summed === key);

      const text = textValue(value);

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
