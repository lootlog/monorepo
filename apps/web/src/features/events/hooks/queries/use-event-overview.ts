import { queryOptions, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";

export interface EventOverviewHeroNpc {
  id: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  npcLvl: number | null;
}

export interface EventOverview {
  id: string;
  guildId: string;
  name: string;
  world: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  basePointsPerKill?: number;
  assignmentTimeoutMinutes?: number;
  participationConfirmationMinutes?: number;
  mapAssignmentCap?: number;
  rulebookMarkdown?: string | null;
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules | null;
  heroNpcs: EventOverviewHeroNpc[];
}

interface UseEventOverviewOptions {
  guildId: string;
  eventId: string;
}

export const eventOverviewQueryOptions = ({
  guildId,
  eventId,
}: UseEventOverviewOptions) =>
  queryOptions({
    queryKey: queryKeys.events.overview(guildId, eventId),
    queryFn: async () => {
      const response = await apiClient.get<EventOverview>(
        `/guilds/${guildId}/events/${eventId}/overview`,
        {} as ApiRequestConfig,
      );
      return response;
    },
    enabled: !!guildId && !!eventId,
  });

export const useEventOverview = ({
  guildId,
  eventId,
}: UseEventOverviewOptions) => {
  useApiClient();

  return useQuery(
    eventOverviewQueryOptions({
      guildId,
      eventId,
    }),
  );
};
