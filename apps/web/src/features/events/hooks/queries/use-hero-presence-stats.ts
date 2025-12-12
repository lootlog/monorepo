import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

export interface MemberPresenceStat {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  totalTimeSeconds: number;
  afkTimeSeconds: number;
  afkPercentage: number;
}

export interface HeroPresenceStats {
  totalCoverageSeconds: number;
  totalEventSeconds: number;
  presencePercentage: number;
  memberStats: MemberPresenceStat[];
}

/**
 * Hook to fetch presence statistics for a hero.
 */
export const useHeroPresenceStats = (eventId: string, heroId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<HeroPresenceStats>({
    queryKey: ["hero-presence-stats", guildId, eventId, heroId],
    queryFn: async () => {
      const response = await client.get<HeroPresenceStats>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/presence-stats`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!heroId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
