import {
  getEventsRankingControllerGetEventHeroStatsQueryOptions,
  getListEventHeroTimersQueryOptions,
  getListEventMapsQueryOptions,
  getShowEventOverviewQueryOptions,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

type EventRouteParams = {
  guildId: string;
  eventId: string;
};

const prefetchEventHeroTimers = async (
  queryClient: QueryClient,
  params: EventRouteParams,
) => {
  // The parent layout loader owns the overview request and its errors; this
  // joins the same in-flight fetch only to learn the event's world.
  const event = await queryClient
    .ensureQueryData(getShowEventOverviewQueryOptions(params))
    .catch(() => undefined);

  if (!event?.world) {
    return;
  }

  await prefetchRouteQuery(
    queryClient,
    getListEventHeroTimersQueryOptions(params, { world: event.world }),
  );
};

/**
 * Starts the event page queries that the layout loader does not wait for, so
 * they load beside the overview instead of after it.
 */
export const prefetchEventDetailQueries = (
  queryClient: QueryClient,
  params: EventRouteParams,
  { heroStats }: { heroStats: boolean },
) => {
  void prefetchRouteQuery(queryClient, getListEventMapsQueryOptions(params));

  if (heroStats) {
    void prefetchRouteQuery(
      queryClient,
      getEventsRankingControllerGetEventHeroStatsQueryOptions(params),
    );
  }

  void prefetchEventHeroTimers(queryClient, params);
};
