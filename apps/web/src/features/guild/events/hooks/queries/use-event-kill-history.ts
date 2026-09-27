import {
  listEventKillHistory,
  getListEventKillHistoryQueryKey,
} from "@lootlog/client/main";
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
  const baseParams: NonNullable<Parameters<typeof listEventKillHistory>[1]> = {
    limit: String(limit),
  };

  if (heroId) baseParams.heroId = heroId;

  return useCursorInfiniteQuery({
    queryKey: getListEventKillHistoryQueryKey({ guildId, eventId }, baseParams),
    fetchPage: async (cursor, signal) => {
      const response = await listEventKillHistory(
        { guildId, eventId },
        {
          ...baseParams,
          cursor,
        },
        { signal },
      );

      if (response.kind !== "event") {
        throw new Error("Unexpected kill history response");
      }

      return response;
    },
    enabled: !!guildId && !!eventId,
  });
};
