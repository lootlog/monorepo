import { useQuery } from "@tanstack/react-query";
import { eventsRankingControllerGetKillDetail } from "@/lib/api/generated/main/events/events";
import type {
  KillDetailResponseDto,
  KillDetailResponseDtoKill,
  KillDetailResponseDtoKillHeroNpc,
  KillDetailResponseDtoKillPointsItem,
  KillDetailResponseDtoKillTimerCreatedBy,
} from "@/lib/api/generated/main/model";
import { queryKeys } from "@/lib/query-keys";
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
    queryKey: queryKeys.events.killDetail(guildId, eventId, heroId, killId),
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
