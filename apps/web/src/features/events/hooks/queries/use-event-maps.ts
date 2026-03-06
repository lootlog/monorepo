import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { EventHeroNpc } from "./use-events";

export interface EventMapsResponse {
  id: string;
  heroNpcs: EventHeroNpc[];
}

interface UseEventMapsOptions {
  guildId: string;
  eventId: string;
}

export const useEventMaps = ({ guildId, eventId }: UseEventMapsOptions) => {
  const { client } = useApiClient();

  return useQuery<EventMapsResponse>({
    queryKey: ["event-maps", guildId, eventId],
    queryFn: async () => {
      const response = await client.get<EventMapsResponse>(
        `/guilds/${guildId}/events/${eventId}/maps`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId,
  });
};
