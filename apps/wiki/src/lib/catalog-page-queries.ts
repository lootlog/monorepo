import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  catalogControllerGetItems,
  type CatalogControllerGetItemsParams,
  type CatalogControllerGetNpcsParams,
  type CatalogItemDtoOutput,
  type CatalogNpcDtoOutput,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/catalog";
import { catalogSlug } from "@lootlog/domain/catalog-slug";
import {
  isNpcCatalogKey,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";

// The catalog queries a page and its route loader share, so the loader
// fills the cache the page reads.

// A template, a legacy and a runtime identity may share an id.
const NPC_IDENTITIES = 3;

const NPC_DROPS_LIMIT = 96;

const RELATED_LIMIT = 13;

// The catalog serves at most 96 per request; a full page fills a large screen
// before "show more" is needed.
const ITEM_RESULTS_PAGE_SIZE = 96;

/** The item an item page shows, by the id in its URL. */
export const itemPageQuery = (id: number) =>
  ({
    ids: [id],
    gameVersion: WIKI_GAME_VERSION,
    limit: 1,
  }) satisfies CatalogControllerGetItemsParams;

/**
 * The monsters an NPC page may show: by the id in its URL, or by the catalog
 * key an old link carries. Undefined when the URL names neither.
 */
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

/** One id may name monsters of several identities; the name picks one. */
export const findPageNpc = (
  npcs: readonly CatalogNpcDtoOutput[],
  npcSlug: string,
) => {
  const slug = readPageSegment(npcSlug)?.slug;

  return npcs.find((npc) => catalogSlug(npc.name) === slug) ?? npcs[0];
};

/** A monster's drops, the highest level first. */
export const npcDropsQuery = (npcKey: string) =>
  ({
    droppedBy: npcKey,
    gameVersion: WIKI_GAME_VERSION,
    sort: "lvl:desc",
    limit: NPC_DROPS_LIMIT,
  }) satisfies CatalogControllerGetItemsParams;

/** The monster whose other drops an item's page shows. */
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

/** The item search's hits, loaded a page at a time. */
export const itemResultsQueryOptions = (params: ItemSearchParams) =>
  infiniteQueryOptions({
    queryKey: [...getCatalogControllerGetItemsQueryKey(params), "pages"],
    queryFn: ({ pageParam, signal }) =>
      catalogControllerGetItems(
        { ...params, limit: ITEM_RESULTS_PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.hits.length, 0);

      return lastPage.hits.length === ITEM_RESULTS_PAGE_SIZE &&
        loaded < lastPage.estimatedTotalHits
        ? loaded
        : undefined;
    },
  });

/**
 * Starts a page's queries from its route loader. A server render waits for
 * them, so its HTML carries the content; the browser renders the page at
 * once and fills it as they arrive, as before a loader existed.
 */
export const prefetchPageQueries = async (
  ...prefetches: ReadonlyArray<Promise<unknown>>
) => {
  const settled = Promise.allSettled(prefetches);

  if (typeof window === "undefined") await settled;
};
