import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { EventRanking } from "./use-events";

interface UseEventRankingOptions {
  guildId: string;
  eventId: string;
}

export const useEventRanking = ({
  guildId,
  eventId,
}: UseEventRankingOptions) => {
  const { client } = useApiClient();

  return useQuery<EventRanking[]>({
    queryKey: ["event-ranking", guildId, eventId],
    queryFn: async () => {
      const response = await client.get<EventRanking[]>(
        `/guilds/${guildId}/events/${eventId}/ranking`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });
};
