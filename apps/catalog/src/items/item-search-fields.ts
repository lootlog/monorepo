import { Predicate } from "effect";
import { itemAttackSpeed } from "@lootlog/domain/attack-speed";
import { itemEventLabels, itemEventSlug } from "@lootlog/domain/item-events";
import {
  parseItemStatEntries,
  truncateAtSecondSeparator,
} from "@lootlog/domain/item-stat";
import { PROFESSION_SHORTNAMES } from "@lootlog/domain/profession";

const numericValuePattern = /^[+-]?\d+(?:\.\d+)?$/;

type ItemStatValue = string | number | boolean | string[];

export type ItemSearchFields = {
  stats: Record<string, ItemStatValue>;
  numericStats: Record<string, number>;
  statsKeys: string[];
  requiredProfessions: string[];
  legendaryBonus: string | null;
  eventSlugs: string[];
  attackSpeed: number;
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
  let requiredProfessions: string[] = [...PROFESSION_SHORTNAMES];
  let legendaryBonus: string | null = null;
  let eventSlugs: string[] = [];

  for (const entry of parseItemStatEntries(statRaw)) {
    if (!entry.key || entry.value === true) {
      continue;
    }

    const { key } = entry;
    const value = truncateAtSecondSeparator(entry.value);

    statsKeys.push(key);

    if (key === "reqp") {
      const parsedRequiredProfessions = parseRequiredProfessions(value);
      stats[key] = parsedRequiredProfessions;
      requiredProfessions = [...parsedRequiredProfessions];
      continue;
    }

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
    attackSpeed: itemAttackSpeed(numericStats),
  };
};
