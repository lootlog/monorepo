import { Predicate } from "effect";
import { itemEventLabels, itemEventSlug } from "@lootlog/domain/item-events";

const DEFAULT_REQUIRED_PROFESSIONS = ["w", "p", "h", "m", "b", "t"] as const;

const numericValuePattern = /^[+-]?\d+(?:\.\d+)?$/;

export type ItemStatValue = string | number | boolean | string[];

export type ItemSearchFields = {
  stats: Record<string, ItemStatValue>;
  numericStats: Record<string, number>;
  statsKeys: string[];
  requiredProfessions: string[];
  /** The legendary bonus without its level, such as `verycrit`; null without one. */
  legendaryBonus: string | null;
  /** The slugs of the events the item belongs to, such as `wakacje-2026`. */
  eventSlugs: string[];
};

const normalizeStatValue = (value: string): string | number | boolean => {
  if (numericValuePattern.test(value)) {
    return Number(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
};

const parseRequiredProfessions = (value: string): string[] =>
  value.split("").filter(Boolean);

export const createItemSearchFields = (statRaw: string): ItemSearchFields => {
  const stats: Record<string, ItemStatValue> = {};
  const numericStats: Record<string, number> = {};
  const statsKeys: string[] = [];
  let requiredProfessions: string[] = [...DEFAULT_REQUIRED_PROFESSIONS];
  let legendaryBonus: string | null = null;
  let eventSlugs: string[] = [];

  for (const statEntry of statRaw.split(";")) {
    const [key, value] = statEntry.split("=");

    if (!key || value === undefined) {
      continue;
    }

    statsKeys.push(key);

    if (key === "reqp") {
      const parsedRequiredProfessions = parseRequiredProfessions(value);
      stats[key] = parsedRequiredProfessions;
      requiredProfessions = [...parsedRequiredProfessions];
      continue;
    }

    // `legbon` holds the bonus and the level it scales with, `verycrit,200`.
    if (key === "legbon") {
      legendaryBonus = value.split(",")[0] || null;
    }

    if (key === "etiquette") {
      eventSlugs = [...new Set(itemEventLabels(value).map(itemEventSlug))];
    }

    const normalizedValue = normalizeStatValue(value);
    stats[key] = normalizedValue;

    if (Predicate.isNumber(normalizedValue)) {
      numericStats[key] = normalizedValue;
    }
  }

  return {
    stats,
    numericStats,
    statsKeys,
    requiredProfessions,
    legendaryBonus,
    eventSlugs,
  };
};
