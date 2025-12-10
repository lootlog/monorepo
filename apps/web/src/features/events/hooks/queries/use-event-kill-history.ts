import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
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
  const { client } = useApiClient();

  return useInfiniteQuery({
    queryKey: ["event-kill-history", guildId, eventId, heroId, limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      if (heroId) {
        params.set("heroId", heroId);
      }

      const response = await client.get<KillHistoryResponse>(
        `/guilds/${guildId}/events/${eventId}/kills?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
};

export type { HeroKill };
