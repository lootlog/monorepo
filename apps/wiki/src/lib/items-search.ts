import {
  type CatalogControllerGetItemsParams,
  CatalogControllerGetItemsSort,
} from "@lootlog/client/search";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
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
  bonuses: string;
  bosses: string;
  sort: string;
};

export const SORT_OPTIONS = Object.values(CatalogControllerGetItemsSort);

type SortOption = (typeof SORT_OPTIONS)[number];

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((option) => option === value);

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
  bonuses?: unknown;
  bosses?: unknown;
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
    // The router reads `?minLevel=200` as a number and a level it wrote as text.
    minLevel:
      typeof search.minLevel === "number" || typeof search.minLevel === "string"
        ? String(search.minLevel)
        : "",
    maxLevel:
      typeof search.maxLevel === "number" || typeof search.maxLevel === "string"
        ? String(search.maxLevel)
        : "",
    stats: typeof search.stats === "string" ? search.stats : "",
    bonuses: typeof search.bonuses === "string" ? search.bonuses : "",
    bosses: typeof search.bosses === "string" ? search.bosses : "",
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

/** The public catalog filters of a search; a slot adds the types it holds. */
export const toCatalogParams = (
  search: ItemsSearch,
): CatalogControllerGetItemsParams => ({
  gameVersion: WIKI_GAME_VERSION,
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
  legendaryBonuses: splitList(search.bonuses),
  dropSourceTypes: splitList(search.bosses),
  sort: isSortOption(search.sort) ? search.sort : undefined,
});
