import {
  eventsRankingControllerGetMemberKillHistory,
  getEventsRankingControllerGetMemberKillHistoryQueryKey,
} from "@lootlog/client/main";
import type {
  HeroKillHeroNpc,
  KillParticipant,
  KillParticipantMember,
} from "./use-hero-kill-history";
import { useCursorInfiniteQuery } from "./use-cursor-infinite-query";

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

  return useCursorInfiniteQuery({
    queryKey: getEventsRankingControllerGetMemberKillHistoryQueryKey(
      { guildId, eventId, memberId },
      baseParams,
    ),
    fetchPage: (cursor) =>
      eventsRankingControllerGetMemberKillHistory(
        { guildId, eventId, memberId },
        {
          ...baseParams,
          cursor,
        },
      ) as Promise<EventMemberKillHistoryResponse>,
    enabled: !!guildId && !!eventId && !!memberId,
  });
};
