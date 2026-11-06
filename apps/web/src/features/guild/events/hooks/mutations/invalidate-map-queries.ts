import { getQueryKeyPath } from "./query-key-path";
import type { QueryClient } from "@tanstack/react-query";
import {
  getEventsMonitoringControllerGetActiveGapForMapQueryKey,
  getEventsMonitoringControllerGetMapCoverageGapsQueryKey,
  getListEventMapsQueryKey,
} from "@lootlog/client/main";

export const isEventHeroGapPath = (
  path: string,
  guildId: string,
  eventId: string,
) =>
  path.startsWith(`/guilds/${guildId}/events/${eventId}/heroes/`) &&
  (path.endsWith("/active-gaps") || path.endsWith("/coverage-gaps"));

export function invalidateMapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  invalidateEventMapListQuery(queryClient, guildId, eventId);

  return invalidateGapQueries(queryClient, guildId, eventId, mapId);
}

function invalidateEventMapListQuery(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getListEventMapsQueryKey({ guildId, eventId }),
  });
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
    predicate: (query) => {
      const path = getQueryKeyPath(query.queryKey);

      return path !== undefined && isEventHeroGapPath(path, guildId, eventId);
    },
  });
}
