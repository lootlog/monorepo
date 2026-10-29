import { useQuery } from "@tanstack/react-query";
import {
  type CatalogItemDtoOutput,
  catalogControllerGetItems,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/search";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

const PAGE_SIZE = 96;

// Meilisearch serves no hits past its `maxTotalHits`.
const MAX_ITEMS = 1000;

/**
 * Every item of one event, highest level first. The page groups them by
 * monster and rarity, so it needs them all rather than a page at a time.
 */
export const useEventItems = (eventSlug: string) => {
  const params = {
    gameVersion: WIKI_GAME_VERSION,
    event: eventSlug,
    sort: "lvl:desc",
  } as const;

  return useQuery({
    queryKey: [...getCatalogControllerGetItemsQueryKey(params), "all"],
    queryFn: async ({ signal }) => {
      const items: CatalogItemDtoOutput[] = [];
      let total = MAX_ITEMS;

      while (items.length < Math.min(total, MAX_ITEMS)) {
        const page = await catalogControllerGetItems(
          { ...params, limit: PAGE_SIZE, offset: items.length },
          { signal },
        );

        items.push(...page.hits);
        total = page.estimatedTotalHits;

        if (page.hits.length < PAGE_SIZE) break;
      }

      return items;
    },
  });
};
