import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateKillQueries } from "./invalidate-kill-queries";

interface UpdateKillPointParams {
  killId: string;
  killPointId: string;
  pointsDelta: number;
  comment?: string;
}

interface UpdateRankingPointsParams {
  rankingId: string;
  pointsDelta: number;
  comment?: string;
}

export const useUpdatePoints = (guildId: string, eventId: string) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  const updateKillPoint = useMutation({
    mutationFn: async ({
      killId,
      killPointId,
      pointsDelta,
      comment,
    }: UpdateKillPointParams) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/kills/${killId}/points/${killPointId}`,
        { pointsDelta, comment },
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateKillQueries(queryClient, guildId, eventId);
      queryClient.invalidateQueries({
        queryKey: ["event-ranking", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ranking-edit-history", guildId, eventId],
      });
    },
  });

  const updateRankingPoints = useMutation({
    mutationFn: async ({
      rankingId,
      pointsDelta,
      comment,
    }: UpdateRankingPointsParams) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/ranking/${rankingId}`,
        { pointsDelta, comment },
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
