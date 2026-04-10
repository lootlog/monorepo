import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  HeroKill,
  KillHistoryResponse,
  KillParticipant,
  HeroKillHeroNpc,
} from "./use-hero-kill-history";

interface ApiHeroKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  isManualClose: boolean;
  heroNpc: HeroKillHeroNpc;
  points: KillParticipant[];
}

interface ApiKillHistoryResponse {
  data: ApiHeroKill[];
  nextCursor: string | null;
}

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
    queryKey: queryKeys.events.killHistory(guildId, eventId, heroId, limit),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      if (heroId) {
        params.set("heroId", heroId);
      }

      const response = await client.get<ApiKillHistoryResponse>(
        `/guilds/${guildId}/events/${eventId}/kills?${params.toString()}`,
      );

      return {
        ...response,
        data: response.data.map((kill) => ({
          ...kill,
          participants: kill.points ?? [],
        })),
      } satisfies KillHistoryResponse;
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
