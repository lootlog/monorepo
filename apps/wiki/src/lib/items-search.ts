import {
  type CatalogControllerGetItemsCategoriesItem,
  type CatalogControllerGetItemsParams,
  CatalogControllerGetItemsSort,
} from "@lootlog/client/catalog";
import { isEquippableItemType } from "@lootlog/domain/item-type";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { findEquipmentSlotById } from "@/lib/equipment-slots";
import { findMargonemWorld } from "@lootlog/domain/margonem-worlds";

export type ItemsSearch = {
  query: string;
  scope: string;
  slot: string;
  types: string;
  professions: string;
  rarities: string;
  minLevel: number | undefined;
  maxLevel: number | undefined;
  stats: string;
  events: string;
  world: string;
  bonuses: string;
  bosses: string;
  sort: string;
};

export const ITEM_SCOPE_TABS = ["equipment", "other", "all"] as const;

export type ItemScopeTab = (typeof ITEM_SCOPE_TABS)[number];

const ITEM_SEARCH_SCOPES = ["equipment", "other", "crafting", "all"] as const;

export type ItemSearchScope = (typeof ITEM_SEARCH_SCOPES)[number];

const isItemSearchScope = (value: unknown): value is ItemSearchScope =>
  ITEM_SEARCH_SCOPES.some((scope) => scope === value);

export const effectiveScope = (
  search: Pick<ItemsSearch, "query" | "scope" | "types">,
): ItemSearchScope => {
  if (isItemSearchScope(search.scope)) return search.scope;

  if (splitList(search.types).some((type) => !isEquippableItemType(type))) {
    return "other";
  }

  return search.query.trim() ? "all" : "equipment";
};

export const activeScopeTab = (scope: ItemSearchScope): ItemScopeTab =>
  scope === "crafting" ? "other" : scope;

const SCOPE_CATEGORIES: Record<
  ItemSearchScope,
  CatalogControllerGetItemsCategoriesItem[] | undefined
> = {
  equipment: ["equipment"],
  crafting: ["crafting"],
  other: ["crafting", "other"],
  all: undefined,
};

export const SORT_OPTIONS = Object.values(CatalogControllerGetItemsSort);

type SortOption = (typeof SORT_OPTIONS)[number];

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((option) => option === value);

export const effectiveSort = (
  search: Pick<ItemsSearch, "query" | "sort">,
): SortOption => {
  if (isSortOption(search.sort)) return search.sort;

  return search.query.trim() ? "relevance" : "lvl:desc";
};

export const BOSS_OPTIONS = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
] as const;

export const STAT_OPTIONS = [
  "crit",
  "evade",
  "hp",
  "sa",
  "pierce",
  "blok",
  "absorb",
  "critval",
  "heal",
  "manabon",
  "energybon",
] as const;

export const EVENT_OPTIONS = ["exclude", "only"] as const;

type EventOption = (typeof EVENT_OPTIONS)[number];

export const isEventOption = (value: unknown): value is EventOption =>
  EVENT_OPTIONS.some((option) => option === value);

export const splitList = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const joinList = (values: readonly string[]) => values.join(",");

export function validateItemsSearch(search: {
  query?: unknown;
  scope?: unknown;
  slot?: unknown;
  types?: unknown;
  professions?: unknown;
  rarities?: unknown;
  minLevel?: unknown;
  maxLevel?: unknown;
  stats?: unknown;
  events?: unknown;
  world?: unknown;
  bonuses?: unknown;
  bosses?: unknown;
  sort?: unknown;
}): ItemsSearch {
  return {
    query: typeof search.query === "string" ? search.query : "",
    scope: isItemSearchScope(search.scope) ? search.scope : "",
    slot:
      typeof search.slot === "string" && findEquipmentSlotById(search.slot)
        ? search.slot
        : "",
    types: typeof search.types === "string" ? search.types : "",
    professions:
      typeof search.professions === "string" ? search.professions : "",
    rarities: typeof search.rarities === "string" ? search.rarities : "",
    minLevel: readLevel(String(search.minLevel ?? "")),
    maxLevel: readLevel(String(search.maxLevel ?? "")),
    stats: typeof search.stats === "string" ? search.stats : "",
    events: isEventOption(search.events) ? search.events : "",
    world:
      typeof search.world === "string" && findMargonemWorld(search.world)
        ? search.world
        : "",
    bonuses: typeof search.bonuses === "string" ? search.bonuses : "",
    bosses: typeof search.bosses === "string" ? search.bosses : "",
    sort:
      typeof search.sort === "string" && isSortOption(search.sort)
        ? search.sort
        : "",
  };
}

export const readLevel = (value: string) => {
  const level = Number.parseInt(value.replaceAll('"', ""), 10);

  return Number.isInteger(level) && level > 0 ? level : undefined;
};

export const toCatalogParams = (
  search: ItemsSearch,
): CatalogControllerGetItemsParams => {
  const categories = SCOPE_CATEGORIES[effectiveScope(search)];

  return {
    gameVersion: WIKI_GAME_VERSION,
    search: search.query.trim() || undefined,
    categories,
    types: [
      ...(findEquipmentSlotById(search.slot)?.types ?? []),
      ...splitList(search.types),
    ],
    professions: splitList(search.professions),
    rarities: splitList(search.rarities),
    minLevel: search.minLevel,
    maxLevel: search.maxLevel,
    statKeys: [
      ...splitList(search.stats),
      ...(search.events === "only" ? (["etiquette"] as const) : []),
    ],
    excludedStatKeys: search.events === "exclude" ? ["etiquette"] : [],
    availableSince: findMargonemWorld(search.world)?.openedOn,
    legendaryBonuses: splitList(search.bonuses),
    dropSourceTypes: splitList(search.bosses),
    sort: effectiveSort(search),
  };
};
