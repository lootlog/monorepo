import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

interface DeleteEventResponse {
  success: boolean;
}

export const useDeleteEvent = (guildId: string) => {
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation<DeleteEventResponse, Error, string>({
    mutationFn: async (eventId: string) => {
      const response = await client.delete<DeleteEventResponse>(
        `/guilds/${guildId}/events/${eventId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};
