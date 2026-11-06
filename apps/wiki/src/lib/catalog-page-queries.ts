import {
  catalogControllerGetItems,
  catalogControllerGetNpcs,
  type CatalogControllerGetItemsParams,
  type CatalogControllerGetNpcsParams,
  type CatalogNpcDtoOutput,
  getCatalogControllerGetItemsQueryOptions,
  getCatalogControllerGetNpcsQueryOptions,
} from "@lootlog/client/search";
import { catalogSlug } from "@lootlog/domain/catalog-slug";
import { createIsomorphicFn } from "@tanstack/react-start";
import {
  isNpcCatalogKey,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";
import { getQueryClient } from "@/lib/query-client";

// A template, a legacy and a runtime identity may share an id.
const NPC_IDENTITIES = 3;

const NPC_DROPS_LIMIT = 96;

// A link preview waits this long for the catalog before the page goes out
// without one.
const SERVER_TIMEOUT_MS = 1500;

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

/**
 * Catalog items for a route loader. The browser shares the page's query
 * cache, so the page reads what the loader fetched; the server asks the
 * public catalog directly, for the link preview in the page's head.
 */
export const loadCatalogItems = createIsomorphicFn()
  .server((params: CatalogControllerGetItemsParams) =>
    catalogControllerGetItems(params, {
      apiClient: {
        baseUrl: process.env.VITE_SEARCH_API_URL,
        timeoutMs: SERVER_TIMEOUT_MS,
      },
    }),
  )
  .client((params: CatalogControllerGetItemsParams) =>
    getQueryClient().ensureQueryData(
      getCatalogControllerGetItemsQueryOptions(params),
    ),
  );

/** Catalog NPCs for a route loader, as `loadCatalogItems` loads items. */
export const loadCatalogNpcs = createIsomorphicFn()
  .server((params: CatalogControllerGetNpcsParams) =>
    catalogControllerGetNpcs(params, {
      apiClient: {
        baseUrl: process.env.VITE_SEARCH_API_URL,
        timeoutMs: SERVER_TIMEOUT_MS,
      },
    }),
  )
  .client((params: CatalogControllerGetNpcsParams) =>
    getQueryClient().ensureQueryData(
      getCatalogControllerGetNpcsQueryOptions(params),
    ),
  );
