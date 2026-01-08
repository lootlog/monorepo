import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { HeroKill, KillParticipant, HeroKillHeroNpc } from "./use-hero-kill-history";

interface ApiHeroKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  isManualClose: boolean;
  heroNpc: HeroKillHeroNpc;
  points: KillParticipant[];
}

interface ApiKillHistoryResponse {
  data: ApiHeroKill[];
  nextCursor: string | null;
}

interface UseRecentHeroKillsOptions {
  guildId: string;
  eventId: string;
  heroId?: string;
  limit?: number;
}

export const useRecentHeroKills = ({
  guildId,
  eventId,
  heroId,
  limit = 5,
}: UseRecentHeroKillsOptions) => {
  const { client } = useApiClient();

  return useQuery<HeroKill[]>({
    queryKey: ["recent-hero-kills", guildId, eventId, heroId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));

      const endpoint = heroId
        ? `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/kills`
        : `/guilds/${guildId}/events/${eventId}/kills`;

      const response = await client.get<ApiKillHistoryResponse>(
        `${endpoint}?${params.toString()}`,
      );

      return response.data.data.map((kill) => ({
        ...kill,
        participants: kill.points ?? [],
      }));
    },
    enabled: !!guildId && !!eventId,
    refetchOnMount: "always",
    staleTime: 0,
  });
};

export type { HeroKill };
