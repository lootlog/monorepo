import { z } from "zod";
import type { Query, QueryClient } from "@tanstack/react-query";
import {
  getEventsMonitoringControllerGetHeroRespawnConfigQueryKey,
  getListEventMapsQueryKey,
} from "@lootlog/client/main";
import { invalidateEventCoordinationQuery } from "./invalidate-event-queries";
import { isEventHeroGapPath } from "./invalidate-map-queries";

const getEventTimersPath = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/timers`;

const getEventMapsPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/maps/`;

const isEventRespawnRelatedQuery = (
  query: Query,
  guildId: string,
  eventId: string,
) => {
  const path = z.string().safeParse(query.queryKey[0]).data;

  if (path === undefined) {
    return false;
  }

  if (path === getEventTimersPath(guildId, eventId)) {
    return true;
  }

  if (path.startsWith(getEventMapsPathPrefix(guildId, eventId))) {
    return path.endsWith("/active-gap") || path.endsWith("/coverage-gaps");
  }

  return isEventHeroGapPath(path, guildId, eventId);
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

  return invalidateEventCoordinationQuery(queryClient, guildId, eventId);
}
