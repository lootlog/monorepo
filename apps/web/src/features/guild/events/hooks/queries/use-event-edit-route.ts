import { useParams } from "@tanstack/react-router";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
} from "@lootlog/client/main";

export type EventRouteParams = {
  guildId: string;
  eventId: string;
};

export const useEventEditRoute = () => {
  const { guildId, eventId } = useParams({ strict: false });

  const routeParams: EventRouteParams = {
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  };

  const hasEventRouteParams = Boolean(guildId && eventId);

  const {
    data: event,
    isLoading,
    error,
  } = useShowEventOverview(routeParams, {
    query: {
      enabled: hasEventRouteParams,
      queryKey: getShowEventOverviewQueryKey(routeParams),
    },
  });

  return { event, error, isLoading, routeParams };
};
