import type { Query, QueryClient } from "@tanstack/react-query";
import {
  getEventsMonitoringControllerGetHeroRespawnConfigQueryKey,
  getListEventMapsQueryKey,
} from "@/lib/api/generated/main/events/events";
import {
  getEventTimersPath,
  getEventMapsPathPrefix,
  getEventHeroesPathPrefix,
} from "./event-query-paths";

const isEventRespawnRelatedQuery = (
  query: Query,
  guildId: string,
  eventId: string,
) => {
  const [path] = query.queryKey;

  if (typeof path !== "string") {
    return false;
  }

  if (path === getEventTimersPath(guildId, eventId)) {
    return true;
  }

  if (path.startsWith(getEventMapsPathPrefix(guildId, eventId))) {
    return path.endsWith("/active-gap") || path.endsWith("/coverage-gaps");
  }

  if (path.startsWith(getEventHeroesPathPrefix(guildId, eventId))) {
    return path.endsWith("/active-gaps") || path.endsWith("/coverage-gaps");
  }

  return false;
};

export function invalidateRespawnQueries(
  queryClient: QueryClient,
  guildId: string | undefined,
  eventId: string,
  heroId: string,
) {
  if (!guildId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey: getEventsMonitoringControllerGetHeroRespawnConfigQueryKey({
      guildId,
      eventId,
      heroId,
    }),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isEventRespawnRelatedQuery(query, guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: getListEventMapsQueryKey({ guildId, eventId }),
  });
}
