import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UpdateKillPointParams {
  killId: string;
  killPointId: string;
  points: number;
}

interface UpdateRankingPointsParams {
  rankingId: string;
  totalPoints: number;
}

export const useUpdatePoints = (guildId: string, eventId: string) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  const updateKillPoint = useMutation({
    mutationFn: async ({
      killId,
      killPointId,
      points,
    }: UpdateKillPointParams) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/kills/${killId}/points/${killPointId}`,
        { points },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kill-detail", guildId, eventId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["event-kill-history", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hero-kill-history", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-hero-kills", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-ranking", guildId, eventId],
      });
    },
  });

  const updateRankingPoints = useMutation({
    mutationFn: async ({
      rankingId,
      totalPoints,
    }: UpdateRankingPointsParams) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/ranking/${rankingId}`,
        { totalPoints },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["event-ranking", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ranking-edit-history", guildId, eventId],
      });
    },
  });

  return {
    updateKillPoint,
    updateRankingPoints,
  };
};
