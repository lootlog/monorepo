import type { QueryClient } from "@tanstack/react-query";
import {
  getCatalogControllerGetItemsQueryOptions,
  getCatalogControllerGetNpcsQueryOptions,
  useCatalogControllerGetItems,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

const COUNT_ONLY = { gameVersion: WIKI_GAME_VERSION, limit: 1 } as const;

export const prefetchCatalogSize = (queryClient: QueryClient) => [
  queryClient.prefetchQuery(
    getCatalogControllerGetItemsQueryOptions(COUNT_ONLY),
  ),
  queryClient.prefetchQuery(
    getCatalogControllerGetNpcsQueryOptions(COUNT_ONLY),
  ),
];

export const useCatalogSize = () => {
  const items = useCatalogControllerGetItems(COUNT_ONLY);
  const npcs = useCatalogControllerGetNpcs(COUNT_ONLY);

  return items.data && npcs.data
    ? {
        items: items.data.estimatedTotalHits,
        npcs: npcs.data.estimatedTotalHits,
      }
    : undefined;
};
