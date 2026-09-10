import {
  eventsRankingControllerGetEventKillHistory,
  getEventsRankingControllerGetEventKillHistoryQueryKey,
} from "@lootlog/client/main";
import type { HeroKill } from "./use-hero-kill-history";
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
  const baseParams: NonNullable<
    Parameters<typeof eventsRankingControllerGetEventKillHistory>[1]
  > = {
    limit: String(limit),
  };

  if (heroId) baseParams.heroId = heroId;

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
      ),
    enabled: !!guildId && !!eventId,
  });
};

export type { HeroKill };
