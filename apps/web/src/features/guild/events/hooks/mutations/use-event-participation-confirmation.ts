import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { invalidateKillQueries } from "./invalidate-kill-queries";
import { queryKeys } from "@/lib/query-keys";

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
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.participationConfirmations(guildId, eventId),
      });
      invalidateKillQueries(queryClient, guildId, eventId);
    },
  });
};
