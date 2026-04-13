import type { Query, QueryClient } from "@tanstack/react-query";
import {
  getEventsMonitoringControllerGetActiveGapForMapQueryKey,
  getEventsMonitoringControllerGetMapCoverageGapsQueryKey,
  getListEventMapsQueryKey,
} from "@/lib/api/generated/main/events/events";
import { getEventHeroesPathPrefix } from "./event-query-paths";

const isHeroGapQuery = (query: Query, guildId: string, eventId: string) => {
  const [path] = query.queryKey;

  return (
    typeof path === "string" &&
    path.startsWith(getEventHeroesPathPrefix(guildId, eventId)) &&
    (path.endsWith("/active-gaps") || path.endsWith("/coverage-gaps"))
  );
};

export function invalidateMapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getListEventMapsQueryKey({ guildId, eventId }),
  });
  invalidateGapQueries(queryClient, guildId, eventId, mapId);
}

export function invalidateGapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getEventsMonitoringControllerGetActiveGapForMapQueryKey({
      guildId,
      eventId,
      mapId,
    }),
  });
  queryClient.invalidateQueries({
    queryKey: getEventsMonitoringControllerGetMapCoverageGapsQueryKey({
      guildId,
      eventId,
      mapId,
    }),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isHeroGapQuery(query, guildId, eventId),
  });
}
