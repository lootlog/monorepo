import { useQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetKillDetail,
  getEventsRankingControllerGetKillDetailQueryKey,
} from "@lootlog/client/main";
import type { KillDetailResponseDto } from "@lootlog/client/main";
import type { KillDetailResponseDtoKill } from "@lootlog/client/main";
import type { KillDetailResponseDtoKillHeroNpc } from "@lootlog/client/main";
import type { KillDetailResponseDtoKillPointsItem } from "@lootlog/client/main";
import type { KillDetailResponseDtoKillTimerCreatedBy } from "@lootlog/client/main";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { normalizeEventScoringRules } from "@lootlog/domain/scoring";
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
