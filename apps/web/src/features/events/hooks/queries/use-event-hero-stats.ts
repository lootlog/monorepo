import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export interface EventHeroStats {
  heroId: string;
  npcId: number;
  npcName: string;
  killCount: number;
}

interface UseEventHeroStatsOptions {
  guildId: string;
  eventId: string;
}

export const useEventHeroStats = ({
  guildId,
  eventId,
}: UseEventHeroStatsOptions) => {
  const { client } = useApiClient();

  return useQuery<EventHeroStats[]>({
    queryKey: ["event-hero-stats", guildId, eventId],
    queryFn: async () => {
      const response = await client.get<EventHeroStats[]>(
        `/guilds/${guildId}/events/${eventId}/hero-stats`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });
};
