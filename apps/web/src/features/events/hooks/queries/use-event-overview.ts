import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
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

export const useEventOverview = ({
  guildId,
  eventId,
}: UseEventOverviewOptions) => {
  const { client } = useApiClient();

  return useQuery<EventOverview>({
    queryKey: ["event-overview", guildId, eventId],
    queryFn: async () => {
      const response = await client.get<EventOverview>(
        `/guilds/${guildId}/events/${eventId}/overview`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });
};
