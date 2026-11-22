import {
  getEventsRankingControllerGetEventHeroStatsQueryOptions,
  getListEventHeroTimersQueryOptions,
  getListEventMapsQueryOptions,
  getShowEventQueryOptions,
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
  const event = await queryClient
    .ensureQueryData(getShowEventQueryOptions(params))
    .catch(() => undefined);

  if (!event?.world) {
    return;
  }

  await prefetchRouteQuery(
    queryClient,
    getListEventHeroTimersQueryOptions(params, { world: event.world }),
  );
};

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
