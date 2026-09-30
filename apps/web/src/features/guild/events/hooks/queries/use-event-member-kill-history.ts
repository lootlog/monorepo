import {
  listEventKillHistory,
  getListEventKillHistoryQueryKey,
} from "@lootlog/client/main";
import { useCursorInfiniteQuery } from "./use-cursor-infinite-query";

interface UseEventMemberKillHistoryOptions {
  guildId: string;
  eventId: string;
  memberId: string;
  heroId?: string;
  limit?: number;
}

export const useEventMemberKillHistory = ({
  guildId,
  eventId,
  memberId,
  heroId,
  limit = 20,
}: UseEventMemberKillHistoryOptions) => {
  const baseParams: NonNullable<Parameters<typeof listEventKillHistory>[1]> = {
    limit: String(limit),
    memberId,
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

      if (response.kind !== "member") {
        throw new Error("Unexpected kill history response");
      }

      return response;
    },
    enabled: !!guildId && !!eventId && !!memberId,
  });
};
