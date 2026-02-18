import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

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
  timeOfDayMultipliers?: Array<{
    from: string;
    to: string;
    multiplier: number;
  }> | null;
  trackersMultipliers?: Record<string, number> | null;
  mapsCountMultipliers?: Record<string, number> | null;
  trackingDurationMultipliers?: Record<string, number> | null;
  assignmentTimeoutMinutes?: number;
  mapAssignmentCap?: number;
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
