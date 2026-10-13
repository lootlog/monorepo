import { z } from "zod";
import type { Query, QueryClient } from "@tanstack/react-query";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getListPendingParticipationConfirmationsQueryKey,
  getShowEventOverviewQueryKey,
} from "@lootlog/client/main";
import { invalidateRankingQueries } from "./invalidate-ranking-queries";
import { invalidateEventCoordinationQuery } from "./invalidate-event-queries";

const getEventHeroesPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/heroes/`;

// Matches the kill history list and the kill detail and timeline reads.
const isEventKillQuery = (query: Query, guildId: string, eventId: string) => {
  const path = z.string().safeParse(query.queryKey[0]).data;

  if (path === undefined) {
    return false;
  }

  if (path === `/guilds/${guildId}/events/${eventId}/kill-history`) {
    return true;
  }

  return (
    path.startsWith(getEventHeroesPathPrefix(guildId, eventId)) &&
    path.includes("/kills/")
  );
};

export function invalidateKillQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  options: { invalidateCoordination?: boolean } = {},
) {
  queryClient.invalidateQueries({
    queryKey: getShowEventOverviewQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isEventKillQuery(query, guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
      guildId,
      eventId,
    }),
  });
  queryClient.invalidateQueries({
    queryKey: getListPendingParticipationConfirmationsQueryKey({
      guildId,
      eventId,
    }),
  });
  invalidateRankingQueries(queryClient, guildId, eventId);

  if (options.invalidateCoordination !== false) {
    return invalidateEventCoordinationQuery(queryClient, guildId, eventId);
  }
}
