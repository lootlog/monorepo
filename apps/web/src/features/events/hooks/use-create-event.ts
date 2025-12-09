import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Event } from "./use-events";

interface HeroMapData {
  mapId: number;
  mapName: string;
}

interface CreateEventData {
  name: string;
  world: string;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  heroNpcs: { npcId: number; npcName: string; maps: HeroMapData[] }[];
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
