import { useInfiniteQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetMemberKillHistory,
  getEventsRankingControllerGetMemberKillHistoryQueryKey,
} from "@/lib/api/generated/main/events/events";
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
  const baseParams = {
    limit: String(limit),
    ...(heroId ? { heroId } : {}),
  };

  return useInfiniteQuery({
    queryKey: getEventsRankingControllerGetMemberKillHistoryQueryKey(
      { guildId, eventId, memberId },
      baseParams,
    ),
    queryFn: ({ pageParam }) =>
      eventsRankingControllerGetMemberKillHistory(
        { guildId, eventId, memberId },
        {
          ...baseParams,
          cursor: typeof pageParam === "string" ? pageParam : undefined,
        },
      ) as Promise<EventMemberKillHistoryResponse>,
    enabled: !!guildId && !!eventId && !!memberId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
  });
};
