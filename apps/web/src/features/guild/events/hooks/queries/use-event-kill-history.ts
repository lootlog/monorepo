import { useInfiniteQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetEventKillHistory,
  getEventsRankingControllerGetEventKillHistoryQueryKey,
} from "@/lib/api/generated/main/events/events";
import type { HeroKill, KillHistoryResponse } from "./use-hero-kill-history";

interface UseEventKillHistoryOptions {
  guildId: string;
  eventId: string;
  heroId?: string;
  limit?: number;
}

export const useEventKillHistory = ({
  guildId,
  eventId,
  heroId,
  limit = 20,
}: UseEventKillHistoryOptions) => {
  const baseParams = {
    limit: String(limit),
    ...(heroId ? { heroId } : {}),
  };

  return useInfiniteQuery({
    queryKey: getEventsRankingControllerGetEventKillHistoryQueryKey(
      { guildId, eventId },
      baseParams,
    ),
    queryFn: ({ pageParam }) =>
      eventsRankingControllerGetEventKillHistory(
        { guildId, eventId },
        {
          ...baseParams,
          cursor: typeof pageParam === "string" ? pageParam : undefined,
        },
      ) as Promise<KillHistoryResponse>,
    enabled: !!guildId && !!eventId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
};

export type { HeroKill };
