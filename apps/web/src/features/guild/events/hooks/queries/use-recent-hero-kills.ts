import { useQuery } from "@tanstack/react-query";
import {
  listEventKillHistory,
  getListEventKillHistoryQueryKey,
} from "@lootlog/client/main";

interface UseRecentHeroKillsOptions {
  guildId: string;
  eventId: string;
  heroId?: string;
  limit?: number;
}

const EVENT_LIVE_QUERY_STALE_TIME_MS = 10_000;

export const useRecentHeroKills = ({
  guildId,
  eventId,
  heroId,
  limit = 5,
}: UseRecentHeroKillsOptions) => {
  const baseParams = { limit: String(limit), heroId };

  return useQuery({
    queryKey: [
      ...getListEventKillHistoryQueryKey({ guildId, eventId }, baseParams),
      "preview",
    ],
    queryFn: async ({ signal }) => {
      const response = await listEventKillHistory(
        { guildId, eventId },
        baseParams,
        { signal },
      );

      if (response.kind !== "event") {
        throw new Error("Unexpected kill history response");
      }

      return response;
    },
    select: (response) => response.data,
    enabled: !!guildId && !!eventId,
    placeholderData: undefined,
    staleTime: EVENT_LIVE_QUERY_STALE_TIME_MS,
  });
};
