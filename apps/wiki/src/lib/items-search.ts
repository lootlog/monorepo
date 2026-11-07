import {
  type CatalogControllerGetItemsParams,
  CatalogControllerGetItemsSort,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { findEquipmentSlotById } from "@/lib/equipment-slots";
import { findMargonemWorld } from "@lootlog/domain/margonem-worlds";

/**
 * The item search as the address bar holds it, so a link opens the same
 * search. Lists are comma separated; empty means no filter, and an empty sort
 * follows the query (`effectiveSort`).
 */
export type ItemsSearch = {
  query: string;
  slot: string;
  types: string;
  professions: string;
  rarities: string;
  minLevel: number | undefined;
  maxLevel: number | undefined;
  stats: string;
  events: string;
  /** The world whose character searches: events it never saw stay out. */
  world: string;
  bonuses: string;
  bosses: string;
  sort: string;
};

export const SORT_OPTIONS = Object.values(CatalogControllerGetItemsSort);

type SortOption = (typeof SORT_OPTIONS)[number];

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((option) => option === value);

/**
 * The chosen sort, or relevance for a query and the highest level without
 * one: with no words to match, every item is equally relevant.
 */
export const effectiveSort = (
  search: Pick<ItemsSearch, "query" | "sort">,
): SortOption => {
  if (isSortOption(search.sort)) return search.sort;

  return search.query.trim() ? "relevance" : "lvl:desc";
};

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
  "critval",
  "heal",
  "manabon",
  "energybon",
] as const;

/**
 * Whether event items show: all of them, none (`exclude`) or only them
 * (`only`). Event items carry the `etiquette` stat that names their events.
 */
export const EVENT_OPTIONS = ["exclude", "only"] as const;

type EventOption = (typeof EVENT_OPTIONS)[number];

const isEventOption = (value: unknown): value is EventOption =>
  EVENT_OPTIONS.some((option) => option === value);

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
  events?: unknown;
  world?: unknown;
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

/**
 * A level the address bar holds: the router reads `?minLevel=200` as a
 * number, and links written before levels were numbers hold `"200"`.
 */
const readLevel = (value: string) => {
  const level = Number.parseInt(value.replaceAll('"', ""), 10);

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
});
