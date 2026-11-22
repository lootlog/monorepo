import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCatalogControllerGetItemsQueryKey } from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { readCatalogItems } from "@/lib/catalog-pages";

export const eventItemsQueryOptions = (eventSlug: string) => {
  const params = {
    gameVersion: WIKI_GAME_VERSION,
    event: eventSlug,
    sort: "lvl:desc",
  } as const;

  return queryOptions({
    queryKey: [...getCatalogControllerGetItemsQueryKey(params), "all"],
    queryFn: ({ signal }) => readCatalogItems(params, { signal }),
  });
};

export const useEventItems = (eventSlug: string) =>
  useQuery(eventItemsQueryOptions(eventSlug));
