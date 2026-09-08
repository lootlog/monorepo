import { z } from "zod";
import type { Query, QueryClient } from "@tanstack/react-query";
import { getListEventRankingQueryKey } from "@lootlog/client/main";

const getEventRankingHistoryPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/ranking/`;

const isEventRankingHistoryQuery = (
  query: Query,
  guildId: string,
  eventId: string,
) => {
  const path = z.string().safeParse(query.queryKey[0]).data;

  return (
    path !== undefined &&
    path.startsWith(getEventRankingHistoryPathPrefix(guildId, eventId)) &&
    path.endsWith("/history")
  );
};

export function invalidateRankingQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getListEventRankingQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isEventRankingHistoryQuery(query, guildId, eventId),
  });
}
