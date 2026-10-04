import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import {
  getEventsMonitoringControllerGetActiveGapForMapQueryKey,
  getEventsMonitoringControllerGetMapCoverageGapsQueryKey,
  getListEventMapsQueryKey,
} from "@lootlog/client/main";
import { invalidateEventCoordinationQuery } from "./invalidate-event-queries";

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

export function invalidateEventMapListQuery(
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
      const path = z.string().safeParse(query.queryKey[0]).data;

      return path !== undefined && isEventHeroGapPath(path, guildId, eventId);
    },
  });

  return invalidateEventCoordinationQuery(queryClient, guildId, eventId);
}
