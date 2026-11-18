import { queryOptions, useQuery } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import {
  type CatalogControllerGetItemsParams,
  type CatalogItemDtoOutput,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { readCatalogItems } from "@/lib/catalog-pages";
import { eventsByPriority } from "@/lib/hero-trackers";
import { latestEventOf } from "@/lib/item-events";

/** The events the home page shows: two rows of its two-column grid. */
export const HOME_EVENTS_SHOWN = 4;

const eventsOf = (items: readonly CatalogItemDtoOutput[]) =>
  new Set(items.flatMap(({ stat }) => latestEventOf(stat) ?? []));

/**
 * The latest events with their items, newest first. Event items carry the
 * event's name, and the game adds items in id order, so pages of the newest
 * ones are read until an event past the last wanted one starts: one large
 * event, such as Halloween, would otherwise fill a whole page alone. Older
 * items that came back belong to their latest event. Tropiciele Herosów
 * editions follow the game's own events.
 */
export const latestEventsQueryOptions = (count: number) => {
  const params = {
    gameVersion: WIKI_GAME_VERSION,
    statKeys: ["etiquette"],
    sort: "id:desc",
  } satisfies CatalogControllerGetItemsParams;

  return queryOptions({
    queryKey: [
      ...getCatalogControllerGetItemsQueryKey(params),
      "events",
      count,
    ],
    queryFn: async ({ signal }) => {
      const items = await readCatalogItems(params, {
        signal,
        isEnough: (read) => eventsOf(read).size > count,
      });

      const events = eventsOf(items);

      const byEvent = groupBy(
        items.filter(({ stat }) => latestEventOf(stat) !== undefined),
        ({ stat }) => latestEventOf(stat) ?? "",
      );

      return eventsByPriority([...events].slice(0, count)).map((name) => ({
        name,
        items: byEvent[name] ?? [],
      }));
    },
  });
};

export const useLatestEvents = (count: number) =>
  useQuery(latestEventsQueryOptions(count));
