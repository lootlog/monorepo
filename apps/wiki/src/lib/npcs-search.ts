import {
  type CatalogControllerGetNpcsParams,
  CatalogControllerGetNpcsSort,
} from "@lootlog/client/catalog";
import { isCatalogMonth } from "@/lib/catalog-days";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { isEventOption, readLevel, splitList } from "@/lib/items-search";
import {
  hasEventMonsters,
  isNpcFilterType,
  type NpcEventChoice,
  npcCatalogFilter,
} from "@/lib/npc-types";

/**
 * The NPC search as the address bar holds it, so a link opens the same
 * search. `types` holds one type: players look for one kind of monster at a
 * time. `events` shows event monsters only or leaves them out. Empty means no
 * filter, and an empty sort is the strongest first.
 */
export type NpcsSearch = {
  query: string;
  types: string;
  events: NpcEventChoice;
  minLevel: number | undefined;
  maxLevel: number | undefined;
  /** The month (`YYYY-MM`) Lootlog first saw the monster in. */
  firstSeen: string;
  sort: string;
};

export const NPC_SORT_OPTIONS = Object.values(CatalogControllerGetNpcsSort);

type NpcSortOption = (typeof NPC_SORT_OPTIONS)[number];

const DEFAULT_NPC_SORT: NpcSortOption = "lvl:desc";

const isNpcSortOption = (value: unknown): value is NpcSortOption =>
  NPC_SORT_OPTIONS.some((option) => option === value);

export const effectiveNpcSort = (search: Pick<NpcsSearch, "sort">) =>
  isNpcSortOption(search.sort) ? search.sort : DEFAULT_NPC_SORT;

export function validateNpcsSearch(search: {
  query?: unknown;
  types?: unknown;
  events?: unknown;
  minLevel?: unknown;
  maxLevel?: unknown;
  firstSeen?: unknown;
  sort?: unknown;
}): NpcsSearch {
  return {
    query: String(search.query ?? ""),
    // A link from before the filter took one type may list several.
    types: splitList(String(search.types ?? "")).find(isNpcFilterType) ?? "",
    events: isEventOption(search.events) ? search.events : "",
    minLevel: readLevel(String(search.minLevel ?? "")),
    maxLevel: readLevel(String(search.maxLevel ?? "")),
    firstSeen: isCatalogMonth(search.firstSeen) ? search.firstSeen : "",
    sort: isNpcSortOption(search.sort) ? search.sort : "",
  };
}

/**
 * The public catalog filters of a search. The default order is the
 * catalog's own, so it is not sent and shares the plain listing's cache.
 */
export const toNpcCatalogParams = (search: NpcsSearch) => {
  const sort = effectiveNpcSort(search);

  const type = isNpcFilterType(search.types) ? search.types : undefined;

  // A type without event monsters ignores the choice.
  const filter = npcCatalogFilter(
    type,
    hasEventMonsters(type) ? search.events : "",
  );

  return {
    gameVersion: WIKI_GAME_VERSION,
    search: search.query.trim() || undefined,
    types: filter.types,
    bossOrigins: filter.bossOrigins,
    minLevel: search.minLevel,
    maxLevel: search.maxLevel,
    firstSeenMonth: search.firstSeen || undefined,
    sort: sort === DEFAULT_NPC_SORT ? undefined : sort,
  } satisfies CatalogControllerGetNpcsParams;
};

export type NpcSearchParams = ReturnType<typeof toNpcCatalogParams>;
