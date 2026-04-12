import type { Query, QueryClient } from "@tanstack/react-query";
import { getListEventRankingQueryKey } from "@/lib/api/generated/main/events/events";

const getEventRankingHistoryPathPrefix = (guildId: string, eventId: string) =>
  `/guilds/${guildId}/events/${eventId}/ranking/`;

const isEventRankingHistoryQuery = (
  query: Query,
  guildId: string,
  eventId: string,
) => {
  const [path] = query.queryKey;

  return (
    typeof path === "string" &&
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
