import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { queryKeys } from "@/lib/query-keys";

export interface MapAssignment {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface MapGap {
  id: string;
  gapType: "UNASSIGNED" | "UNCOVERED";
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

export interface MapTimelineData {
  mapId: string;
  mapName: string;
  numericMapId: number;
  assignments: MapAssignment[];
  gaps: MapGap[];
}

interface UseKillTimelineOptions {
  eventId: string;
  heroId: string;
  killId: string;
}

export const useKillTimeline = ({
  eventId,
  heroId,
  killId,
}: UseKillTimelineOptions) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: queryKeys.events.killTimeline(guildId, eventId, heroId, killId),
    queryFn: async (): Promise<MapTimelineData[]> => {
      const response = await client.get<MapTimelineData[]>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/kills/${killId}/timeline`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!heroId && !!killId,
  });
};
