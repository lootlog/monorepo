import { useQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import {
  type CatalogControllerGetItemsParams,
  type CatalogItemDtoOutput,
  catalogControllerGetItems,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/search";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { latestEventOf } from "@/lib/item-events";

const PAGE_SIZE = 96;

// Meilisearch serves no hits past its `maxTotalHits`.
const MAX_ITEMS = 1000;

/**
 * The latest events with their items, newest first. Event items carry the
 * event's name, and the game adds items in id order, so pages of the newest
 * ones are read until an event past the last wanted one starts: one large
 * event, such as Halloween, would otherwise fill a whole page alone. Older
 * items that came back belong to their latest event.
 */
export const useLatestEvents = (count: number) => {
  const params = {
    gameVersion: WIKI_GAME_VERSION,
    statKeys: ["etiquette"],
    sort: "id:desc",
  } satisfies CatalogControllerGetItemsParams;

  return useQuery({
    queryKey: [
      ...getCatalogControllerGetItemsQueryKey(params),
      "events",
      count,
    ],
    queryFn: async ({ signal }) => {
      const items: CatalogItemDtoOutput[] = [];
      const events = new Set<string>();

      while (events.size <= count && items.length < MAX_ITEMS) {
        const page = await catalogControllerGetItems(
          { ...params, limit: PAGE_SIZE, offset: items.length },
          { signal },
        );

        items.push(...page.hits);

        for (const { stat } of page.hits) {
          const event = latestEventOf(stat);

          if (event !== undefined) events.add(event);
        }

        if (page.hits.length < PAGE_SIZE) break;
      }

      const byEvent = groupBy(
        items.filter(({ stat }) => latestEventOf(stat) !== undefined),
        ({ stat }) => latestEventOf(stat) ?? "",
      );

      return [...events]
        .slice(0, count)
        .map((name) => ({ name, items: byEvent[name] ?? [] }));
    },
  });
};
