import type { Query, QueryClient } from "@tanstack/react-query";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getListPendingParticipationConfirmationsQueryKey,
  getShowEventOverviewQueryKey,
} from "@/lib/api/generated/main/events/events";
import { invalidateRankingQueries } from "./invalidate-ranking-queries";

const getEventKillsPath = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/kills`;

const getEventMembersPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/members/`;

const getEventHeroesPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/heroes/`;

const isEventKillQuery = (query: Query, guildId: string, eventId: string) => {
  const [path] = query.queryKey;

  if (typeof path !== "string") {
    return false;
  }

  if (path === getEventKillsPath(guildId, eventId)) {
    return true;
  }

  if (
    path.startsWith(getEventMembersPathPrefix(guildId, eventId)) &&
    path.endsWith("/kills")
  ) {
    return true;
  }

  if (
    path.startsWith(getEventHeroesPathPrefix(guildId, eventId)) &&
    path.endsWith("/kills")
  ) {
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
}
