import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

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
      queryClient.invalidateQueries({
        queryKey: ["event-ranking", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-kill-history", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hero-kill-history", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["event-member-kill-history", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-hero-kills", guildId, eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["kill-detail", guildId, eventId],
      });
    },
  });
};
