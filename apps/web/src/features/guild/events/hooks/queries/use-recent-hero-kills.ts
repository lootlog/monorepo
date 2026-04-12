import { useQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetEventKillHistory,
  eventsRankingControllerGetHeroKillHistory,
} from "@/lib/api/generated/main/events/events";
import { queryKeys } from "@/lib/query-keys";
import type { HeroKill } from "./use-hero-kill-history";

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
  return useQuery<HeroKill[]>({
    queryKey: queryKeys.events.recentHeroKills(guildId, eventId, heroId, limit),
    queryFn: async () => {
      if (heroId) {
        const response = await eventsRankingControllerGetHeroKillHistory(
          { guildId, eventId, heroId },
          { limit: String(limit) },
        );
        return response.data;
      }

      const response = await eventsRankingControllerGetEventKillHistory(
        { guildId, eventId },
        { limit: String(limit) },
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
    refetchOnMount: "always",
    staleTime: 0,
  });
};

export type { HeroKill };
