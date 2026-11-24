import type { QueryClient } from "@tanstack/react-query";
import {
  type CatalogControllerGetItemsParams,
  type CatalogEventDtoOutput,
  getCatalogControllerGetEventsQueryOptions,
  getCatalogControllerGetItemsQueryOptions,
  useCatalogControllerGetEvents,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";
import { WIKI_EVENTS_QUERY } from "@/lib/item-events";

const HOME_EVENTS_SHOWN = 4;

export const homeEventItemsParams = (slug: string) =>
  ({
    gameVersion: WIKI_GAME_VERSION,
    event: slug,
    sort: "lvl:desc",
    limit: 64,
  }) satisfies CatalogControllerGetItemsParams;

const homeEvents = (events: readonly CatalogEventDtoOutput[]) =>
  events
    .filter(({ name }) => !isHeroTrackersEvent(name))
    .slice(0, HOME_EVENTS_SHOWN);

export const prefetchHomeEvents = async (queryClient: QueryClient) => {
  const { events } = await queryClient.ensureQueryData(
    getCatalogControllerGetEventsQueryOptions(WIKI_EVENTS_QUERY),
  );

  await Promise.all(
    homeEvents(events).map(({ slug }) =>
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(homeEventItemsParams(slug)),
      ),
    ),
  );
};

export const useHomeEvents = () => {
  const { data, isError } = useCatalogControllerGetEvents(WIKI_EVENTS_QUERY);

  return { events: data ? homeEvents(data.events) : undefined, isError };
};
