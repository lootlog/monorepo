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

export type NpcsSearch = {
  query: string;
  types: string;
  events: NpcEventChoice;
  minLevel: number | undefined;
  maxLevel: number | undefined;
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
    types: splitList(String(search.types ?? "")).find(isNpcFilterType) ?? "",
    events: isEventOption(search.events) ? search.events : "",
    minLevel: readLevel(String(search.minLevel ?? "")),
    maxLevel: readLevel(String(search.maxLevel ?? "")),
    firstSeen: isCatalogMonth(search.firstSeen) ? search.firstSeen : "",
    sort: isNpcSortOption(search.sort) ? search.sort : "",
  };
}

export const toNpcCatalogParams = (search: NpcsSearch) => {
  const sort = effectiveNpcSort(search);

  const type = isNpcFilterType(search.types) ? search.types : undefined;

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
