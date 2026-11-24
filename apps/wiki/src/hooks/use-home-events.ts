import { type QueryClient, useQueries } from "@tanstack/react-query";
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

const HOME_EVENT_CANDIDATES = 8;

const equipmentItemsOptions = (slug: string) =>
  getCatalogControllerGetItemsQueryOptions({
    gameVersion: WIKI_GAME_VERSION,
    event: slug,
    categories: ["equipment"],
    sort: "lvl:desc",
    limit: 64,
  } satisfies CatalogControllerGetItemsParams);

const candidateEvents = (events: readonly CatalogEventDtoOutput[]) =>
  events
    .filter(({ name }) => !isHeroTrackersEvent(name))
    .slice(0, HOME_EVENT_CANDIDATES);

export const prefetchHomeEvents = async (queryClient: QueryClient) => {
  const { events } = await queryClient.ensureQueryData(
    getCatalogControllerGetEventsQueryOptions(WIKI_EVENTS_QUERY),
  );

  await Promise.all(
    candidateEvents(events).map(({ slug }) =>
      queryClient.prefetchQuery(equipmentItemsOptions(slug)),
    ),
  );
};

export const useHomeEvents = () => {
  const events = useCatalogControllerGetEvents(WIKI_EVENTS_QUERY);
  const candidates = events.data ? candidateEvents(events.data.events) : [];

  const items = useQueries({
    queries: candidates.map(({ slug }) => equipmentItemsOptions(slug)),
  });

  const isLoading =
    !events.data || items.some(({ data, isError }) => !data && !isError);

  return {
    isError: events.isError,
    events: isLoading
      ? undefined
      : candidates
          .flatMap((event, index) => {
            const equipment = items[index]?.data;

            return equipment && equipment.hits.length > 0
              ? [{ event, equipment }]
              : [];
          })
          .slice(0, HOME_EVENTS_SHOWN),
  };
};
