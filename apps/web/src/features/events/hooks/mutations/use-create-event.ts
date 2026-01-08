import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Event } from "../queries/use-events";

interface CreateEventData {
  name: string;
  world: string;
  startsAt?: string;
  endsAt?: string;
}

export const useCreateEvent = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation<Event, Error, CreateEventData>({
    mutationFn: async (data) => {
      const response = await client.post<Event>(
        `/guilds/${guildId}/events`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};
