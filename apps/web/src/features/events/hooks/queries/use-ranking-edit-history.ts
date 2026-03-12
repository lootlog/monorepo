import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export interface PointsEditHistoryEntry {
  id: string;
  rankingId: string;
  previousPoints: number;
  newPoints: number;
  deltaPoints: number;
  editType: "KILL_POINT" | "RANKING";
  editedByUserId: string;
  editedByName: string | null;
  comment: string | null;
  editedAt: string;
}

interface UseRankingEditHistoryOptions {
  guildId: string;
  eventId: string;
  rankingId: string;
  enabled?: boolean;
}

export const useRankingEditHistory = ({
  guildId,
  eventId,
  rankingId,
  enabled = true,
}: UseRankingEditHistoryOptions) => {
  const { client } = useApiClient();

  return useQuery<PointsEditHistoryEntry[]>({
    queryKey: ["ranking-edit-history", guildId, eventId, rankingId],
    queryFn: async () => {
      const response = await client.get<PointsEditHistoryEntry[]>(
        `/guilds/${guildId}/events/${eventId}/ranking/${rankingId}/history`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!rankingId && enabled,
  });
};
