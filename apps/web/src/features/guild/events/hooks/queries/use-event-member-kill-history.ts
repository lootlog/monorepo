import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  HeroKillHeroNpc,
  KillParticipant,
  KillParticipantMember,
} from "./use-hero-kill-history";

export interface EventMemberKill {
  id: string;
  heroNpcId: string;
  killedAt: string;
  minSpawnTimeAtKill: string;
  maxSpawnTimeAtKill: string;
  isManualClose: boolean;
  heroNpc: HeroKillHeroNpc;
  memberPoint: KillParticipant | null;
}

export interface EventMemberKillHistoryResponse {
  member: KillParticipantMember;
  data: EventMemberKill[];
  nextCursor: string | null;
}

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
  const { client } = useApiClient();

  return useInfiniteQuery({
    queryKey: queryKeys.events.memberKillHistory(
      guildId,
      eventId,
      memberId,
      heroId,
      limit,
    ),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      if (heroId) {
        params.set("heroId", heroId);
      }

      const response = await client.get<EventMemberKillHistoryResponse>(
        `/guilds/${guildId}/events/${eventId}/members/${memberId}/kills?${params.toString()}`,
      );

      return response;
    },
    enabled: !!guildId && !!eventId && !!memberId,
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
};
