import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  catalogControllerGetItems,
  catalogControllerGetNpcs,
  getCatalogControllerGetNpcsQueryKey,
  type CatalogControllerGetItemsParams,
  type CatalogControllerGetNpcsParams,
  type CatalogItemDtoOutput,
  type CatalogNpcDtoOutput,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/catalog";
import type { NpcSearchParams } from "@/lib/npcs-search";
import { catalogSlug } from "@lootlog/domain/catalog-slug";
import {
  isNpcCatalogKey,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";

const NPC_IDENTITIES = 3;

const NPC_DROPS_LIMIT = 96;

const RELATED_LIMIT = 13;

export const RESULTS_PAGE_SIZE = 96;

const nextResultsOffset = (
  lastPage: { hits: readonly unknown[]; estimatedTotalHits: number },
  pages: ReadonlyArray<{ hits: readonly unknown[] }>,
) => {
  const loaded = pages.reduce((sum, page) => sum + page.hits.length, 0);

  return lastPage.hits.length === RESULTS_PAGE_SIZE &&
    loaded < lastPage.estimatedTotalHits
    ? loaded
    : undefined;
};

export const itemPageQuery = (id: number) =>
  ({
    ids: [id],
    gameVersion: WIKI_GAME_VERSION,
    limit: 1,
  }) satisfies CatalogControllerGetItemsParams;

export const npcPageQuery = (npcSlug: string) => {
  if (isNpcCatalogKey(npcSlug)) {
    return {
      keys: [npcSlug],
      gameVersion: WIKI_GAME_VERSION,
      limit: NPC_IDENTITIES,
    } satisfies CatalogControllerGetNpcsParams;
  }

  const segment = readPageSegment(npcSlug);

  if (!segment) return undefined;

  return {
    ids: [segment.id],
    gameVersion: WIKI_GAME_VERSION,
    limit: NPC_IDENTITIES,
  } satisfies CatalogControllerGetNpcsParams;
};

export const findPageNpc = (
  npcs: readonly CatalogNpcDtoOutput[],
  npcSlug: string,
) => {
  const slug = readPageSegment(npcSlug)?.slug;

  return npcs.find((npc) => catalogSlug(npc.name) === slug) ?? npcs[0];
};

export const npcDropsQuery = (npcKey: string) =>
  ({
    droppedBy: npcKey,
    gameVersion: WIKI_GAME_VERSION,
    sort: "lvl:desc",
    limit: NPC_DROPS_LIMIT,
  }) satisfies CatalogControllerGetItemsParams;

export const relatedDropsSource = (item: CatalogItemDtoOutput) =>
  item.droppedBy.find(({ retired }) => !retired) ?? item.droppedBy[0];

export const relatedDropsQuery = (npcKey: string) =>
  ({
    droppedBy: npcKey,
    gameVersion: WIKI_GAME_VERSION,
    sort: "lvl:desc",
    limit: RELATED_LIMIT,
  }) satisfies CatalogControllerGetItemsParams;

export type ItemSearchParams = Omit<
  CatalogControllerGetItemsParams,
  "limit" | "offset"
>;

export const npcResultsQueryOptions = (params: NpcSearchParams) =>
  infiniteQueryOptions({
    queryKey: [...getCatalogControllerGetNpcsQueryKey(params), "pages"],
    queryFn: ({ pageParam, signal }) =>
      catalogControllerGetNpcs(
        { ...params, limit: RESULTS_PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: nextResultsOffset,
  });

export const itemResultsQueryOptions = (params: ItemSearchParams) =>
  infiniteQueryOptions({
    queryKey: [...getCatalogControllerGetItemsQueryKey(params), "pages"],
    queryFn: ({ pageParam, signal }) =>
      catalogControllerGetItems(
        { ...params, limit: RESULTS_PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: nextResultsOffset,
  });

export const prefetchPageQueries = async (
  ...prefetches: ReadonlyArray<Promise<unknown>>
) => {
  const settled = Promise.allSettled(prefetches);

  if (typeof window === "undefined") await settled;
};
