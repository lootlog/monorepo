import { useQuery } from "@tanstack/react-query";
import type { Event } from "./use-events";
import { useApiClient } from "@/hooks/api/use-api-client";

interface UseEventOptions {
  guildId: string;
  eventId: string;
}

export const useEvent = ({ guildId, eventId }: UseEventOptions) => {
  const { client } = useApiClient();

  return useQuery<Event>({
    queryKey: ["event", guildId, eventId],
    queryFn: async () => {
      const response = await client.get<Event>(
        `/guilds/${guildId}/events/${eventId}`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });
};
