import {
  type CatalogControllerGetItemsParams,
  CatalogControllerGetItemsSort,
} from "@lootlog/client/search";
import { findEquipmentSlotById } from "@/lib/equipment-slots";

/**
 * The item search as the address bar holds it, so a link opens the same
 * search. Lists are comma separated; empty means no filter.
 */
export type ItemsSearch = {
  query: string;
  slot: string;
  types: string;
  professions: string;
  rarities: string;
  minLevel: string;
  maxLevel: string;
  stats: string;
  bosses: string;
  recent: string;
  sort: string;
};

export const SORT_OPTIONS = Object.values(CatalogControllerGetItemsSort);

type SortOption = (typeof SORT_OPTIONS)[number];

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((option) => option === value);

/** Days a "first drop" filter reaches back. */
export const RECENT_OPTIONS = ["1", "7", "30"] as const;

/** Bosses an item can come from, strongest first. */
export const BOSS_OPTIONS = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
] as const;

/** Stats a search can require, as the public catalog accepts them. */
export const STAT_OPTIONS = [
  "legbon",
  "crit",
  "evade",
  "hp",
  "sa",
  "pierce",
  "blok",
  "absorb",
] as const;

export const splitList = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const joinList = (values: readonly string[]) => values.join(",");

export function validateItemsSearch(search: {
  query?: unknown;
  slot?: unknown;
  types?: unknown;
  professions?: unknown;
  rarities?: unknown;
  minLevel?: unknown;
  maxLevel?: unknown;
  stats?: unknown;
  bosses?: unknown;
  recent?: unknown;
  sort?: unknown;
}): ItemsSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    slot:
      typeof search.slot === "string" && findEquipmentSlotById(search.slot)
        ? search.slot
        : "",
    types: typeof search.types === "string" ? search.types : "",
    professions:
      typeof search.professions === "string" ? search.professions : "",
    rarities: typeof search.rarities === "string" ? search.rarities : "",
    minLevel: typeof search.minLevel === "string" ? search.minLevel : "",
    maxLevel: typeof search.maxLevel === "string" ? search.maxLevel : "",
    stats: typeof search.stats === "string" ? search.stats : "",
    bosses: typeof search.bosses === "string" ? search.bosses : "",
    recent: typeof search.recent === "string" ? search.recent : "",
    sort:
      typeof search.sort === "string" && isSortOption(search.sort)
        ? search.sort
        : "relevance",
  };
}

export const readLevel = (value: string) => {
  const level = Number.parseInt(value, 10);

  return Number.isInteger(level) && level > 0 ? level : undefined;
};

const recentDays = (value: string) => {
  const days = Number(value);

  return Number.isInteger(days) && days > 0 ? days : undefined;
};

/** The public catalog query for a search; a slot adds the types it holds. */
export const toCatalogParams = (
  search: ItemsSearch,
  limit: number,
): CatalogControllerGetItemsParams => ({
  search: search.query.trim() || undefined,
  types: [
    ...(findEquipmentSlotById(search.slot)?.types ?? []),
    ...splitList(search.types),
  ],
  professions: splitList(search.professions),
  rarities: splitList(search.rarities),
  minLevel: readLevel(search.minLevel),
  maxLevel: readLevel(search.maxLevel),
  statKeys: splitList(search.stats),
  dropSourceTypes: splitList(search.bosses),
  firstSeenWithinDays: recentDays(search.recent),
  sort: isSortOption(search.sort) ? search.sort : undefined,
  limit,
});
