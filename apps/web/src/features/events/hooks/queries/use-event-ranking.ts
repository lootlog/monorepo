import { queryOptions, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { EventRanking } from "./use-events";

interface UseEventRankingOptions {
  guildId: string;
  eventId: string;
  suppressRouteErrorToast?: boolean;
}

export const eventRankingQueryOptions = ({
  guildId,
  eventId,
  suppressRouteErrorToast = false,
}: UseEventRankingOptions) =>
  queryOptions({
    queryKey: ["event-ranking", guildId, eventId],
    queryFn: async () => {
      const response = await apiClient.get<EventRanking[]>(
        `/guilds/${guildId}/events/${eventId}/ranking`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });

export const useEventRanking = ({
  guildId,
  eventId,
  suppressRouteErrorToast = false,
}: UseEventRankingOptions) => {
  useApiClient();

  return useQuery(
    eventRankingQueryOptions({
      guildId,
      eventId,
      suppressRouteErrorToast,
    }),
  );
};
