import { useQuery } from "@tanstack/react-query";
import {
  eventsRankingControllerGetKillDetail,
  getEventsRankingControllerGetKillDetailQueryKey,
} from "@lootlog/api-client/react-query/main/events";
import type { KillDetailResponseDto } from "@lootlog/api-client/models/main/kill-detail-response-dto";
import type { KillDetailResponseDtoKill } from "@lootlog/api-client/models/main/kill-detail-response-dto-kill";
import type { KillDetailResponseDtoKillHeroNpc } from "@lootlog/api-client/models/main/kill-detail-response-dto-kill-hero-npc";
import type { KillDetailResponseDtoKillPointsItem } from "@lootlog/api-client/models/main/kill-detail-response-dto-kill-points-item";
import type { KillDetailResponseDtoKillTimerCreatedBy } from "@lootlog/api-client/models/main/kill-detail-response-dto-kill-timer-created-by";
import type { EventScoringRules } from "../../types/scoring-rules";
import { normalizeScoringRules } from "../../utils/scoring-rules";
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
            ? normalizeScoringRules(response.eventConfig.scoringRules)
            : null,
        },
      } satisfies KillDetailResponse;
    },
    enabled: !!guildId && !!eventId && !!heroId && !!killId,
  });
};
