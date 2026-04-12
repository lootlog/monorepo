import { useQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetEventKillHistory,
  eventsRankingControllerGetHeroKillHistory,
  getEventsRankingControllerGetEventKillHistoryQueryKey,
  getEventsRankingControllerGetHeroKillHistoryQueryKey,
} from "@/lib/api/generated/main/events/events";
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
  const baseParams = { limit: String(limit) };

  return useQuery<HeroKill[]>({
    queryKey: heroId
      ? getEventsRankingControllerGetHeroKillHistoryQueryKey(
          { guildId, eventId, heroId },
          baseParams,
        )
      : getEventsRankingControllerGetEventKillHistoryQueryKey(
          { guildId, eventId },
          baseParams,
        ),
    queryFn: async () => {
      if (heroId) {
        const response = await eventsRankingControllerGetHeroKillHistory(
          { guildId, eventId, heroId },
          baseParams,
        );
        return response.data;
      }

      const response = await eventsRankingControllerGetEventKillHistory(
        { guildId, eventId },
        baseParams,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
    refetchOnMount: "always",
    staleTime: 0,
  });
};

export type { HeroKill };
