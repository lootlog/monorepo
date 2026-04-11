import { queryOptions, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { EventRanking } from "./use-events";
import { queryKeys } from "@/lib/query-keys";

interface UseEventRankingOptions {
  guildId: string;
  eventId: string;
}

export const eventRankingQueryOptions = ({
  guildId,
  eventId,
}: UseEventRankingOptions) =>
  queryOptions({
    queryKey: queryKeys.events.ranking(guildId, eventId),
    queryFn: async () => {
      const response = await apiClient.get<EventRanking[]>(
        `/guilds/${guildId}/events/${eventId}/ranking`,
        {} as ApiRequestConfig,
      );
      return response;
    },
    enabled: !!guildId && !!eventId,
  });

export const useEventRanking = ({
  guildId,
  eventId,
}: UseEventRankingOptions) => {
  useApiClient();

  return useQuery(
    eventRankingQueryOptions({
      guildId,
      eventId,
    }),
  );
};
