import {
  eventsRankingControllerGetEventKillHistory,
  getEventsRankingControllerGetEventKillHistoryQueryKey,
} from "@lootlog/api-client/react-query/main/events";
import type { HeroKill, KillHistoryResponse } from "./use-hero-kill-history";
import { useCursorInfiniteQuery } from "./use-cursor-infinite-query";

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

  return useCursorInfiniteQuery({
    queryKey: getEventsRankingControllerGetEventKillHistoryQueryKey(
      { guildId, eventId },
      baseParams,
    ),
    fetchPage: (cursor) =>
      eventsRankingControllerGetEventKillHistory(
        { guildId, eventId },
        {
          ...baseParams,
          cursor,
        },
      ) as Promise<KillHistoryResponse>,
    enabled: !!guildId && !!eventId,
  });
};

export type { HeroKill };
