import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { invalidateKillQueries } from "./invalidate-kill-queries";

interface UseEventParticipationConfirmationOptions {
  guildId: string;
  eventId: string;
}

export const useEventParticipationConfirmation = ({
  guildId,
  eventId,
}: UseEventParticipationConfirmationOptions) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (killId: string) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/kills/${killId}/confirm-participation`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["event-participation-confirmations", guildId, eventId],
      });
      invalidateKillQueries(queryClient, guildId, eventId);
    },
  });
};
