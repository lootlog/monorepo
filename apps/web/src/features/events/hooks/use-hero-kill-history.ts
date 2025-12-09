import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export interface KillParticipantMember {
  id: number;
  name: string;
  avatar: string | null;
  userId: string;
}

export interface KillParticipant {
  id: string;
  memberId: number;
  mapName: string;
  points: number;
  basePoints: number;
  appliedMultiplier: number;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  member: KillParticipantMember;
}

export interface HeroKillHeroNpc {
  id: string;
  npcId: number | null;
  npcName: string;
}

export interface HeroKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  heroNpc: HeroKillHeroNpc;
  participants: KillParticipant[];
}

interface ApiHeroKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  heroNpc: HeroKillHeroNpc;
  points: KillParticipant[];
}

interface ApiKillHistoryResponse {
  data: ApiHeroKill[];
  nextCursor: string | null;
}

export interface KillHistoryResponse {
  data: HeroKill[];
  nextCursor: string | null;
}

interface UseHeroKillHistoryOptions {
  guildId: string;
  eventId: string;
  heroId: string;
  limit?: number;
}

export const useHeroKillHistory = ({
  guildId,
  eventId,
  heroId,
  limit = 20,
}: UseHeroKillHistoryOptions) => {
  const { client } = useApiClient();

  return useInfiniteQuery({
    queryKey: ["hero-kill-history", guildId, eventId, heroId, limit],
    queryFn: async ({ pageParam }): Promise<KillHistoryResponse> => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }

      const response = await client.get<ApiKillHistoryResponse>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/kills?${params.toString()}`,
      );

      // Map API response: rename 'points' to 'participants'
      return {
        data: response.data.data.map((kill) => ({
          ...kill,
          participants: kill.points ?? [],
        })),
        nextCursor: response.data.nextCursor,
      };
    },
    enabled: !!guildId && !!eventId && !!heroId,
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
};
