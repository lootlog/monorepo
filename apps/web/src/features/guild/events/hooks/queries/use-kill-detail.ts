import { useQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetKillDetail,
  getEventsRankingControllerGetKillDetailQueryKey,
  type KillDetailResponseDto,
  type KillDetailResponseDtoKill,
  type KillDetailResponseDtoKillHeroNpc,
  type KillDetailResponseDtoKillPointsItem,
  type KillDetailResponseDtoKillTimerCreatedBy,
} from "@lootlog/client/main";

import {
  type EventScoringRules,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";

export type KillDetailMember = KillDetailResponseDtoKillTimerCreatedBy;

export type KillDetailParticipant = KillDetailResponseDtoKillPointsItem;

export type KillDetailHeroNpc = KillDetailResponseDtoKillHeroNpc;

export type KillDetail = KillDetailResponseDtoKill;

export type EventConfig = {
  scoringMode: KillDetailResponseDto["eventConfig"]["scoringMode"];
  scoringRules: EventScoringRules | null;
};

export type KillDetailResponse = Omit<KillDetailResponseDto, "eventConfig"> & {
  eventConfig: EventConfig;
};

interface UseKillDetailOptions {
  guildId: string;
  eventId: string;
  heroId: string;
  killId: string;
}

export const useKillDetail = ({
  guildId,
  eventId,
  heroId,
  killId,
}: UseKillDetailOptions) => {
  return useQuery({
    queryKey: getEventsRankingControllerGetKillDetailQueryKey({
      guildId,
      eventId,
      heroId,
      killId,
    }),
    queryFn: async () => {
      const response = await eventsRankingControllerGetKillDetail({
        guildId,
        eventId,
        heroId,
        killId,
      });

      return {
        ...response,
        eventConfig: {
          ...response.eventConfig,
          scoringRules: response.eventConfig.scoringRules
            ? normalizeEventScoringRules(response.eventConfig.scoringRules)
            : null,
        },
      } satisfies KillDetailResponse;
    },
    enabled: !!guildId && !!eventId && !!heroId && !!killId,
  });
};
