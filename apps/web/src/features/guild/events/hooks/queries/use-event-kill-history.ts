import { useInfiniteQuery } from "@tanstack/react-query";
import { eventsRankingControllerGetEventKillHistory } from "@/lib/api/generated/main/events/events";
import { queryKeys } from "@/lib/query-keys";
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
  return useInfiniteQuery({
    queryKey: queryKeys.events.killHistory(guildId, eventId, heroId, limit),
    queryFn: ({ pageParam }) =>
      eventsRankingControllerGetEventKillHistory(
        { guildId, eventId },
        {
          limit: String(limit),
          heroId,
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
