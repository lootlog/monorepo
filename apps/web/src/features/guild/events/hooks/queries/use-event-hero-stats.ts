import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

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
    queryKey: queryKeys.events.heroStats(guildId, eventId),
    queryFn: async () => {
      const response = await client.get<EventHeroStats[]>(
        `/guilds/${guildId}/events/${eventId}/hero-stats`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId,
  });
};
