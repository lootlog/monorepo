import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UpdateEventData {
  name?: string;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
}

interface HeroMapData {
  mapId: number;
  mapName: string;
}

interface CreateHeroData {
  npcId: number;
  npcName: string;
  maps?: HeroMapData[];
}

interface UpdateHeroData {
  npcName: string;
}

interface CreateMapData {
  mapId: number;
  mapName: string;
}

export const useEventMutations = (guildId: string, eventId: string) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const queryKey = ["event", guildId, eventId];

  const updateEvent = useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const addHero = useMutation({
    mutationFn: async (data: CreateHeroData) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateHero = useMutation({
    mutationFn: async ({
      heroId,
      data,
    }: {
      heroId: string;
      data: UpdateHeroData;
    }) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteHero = useMutation({
    mutationFn: async (heroId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addMap = useMutation({
    mutationFn: async ({
      heroId,
      data,
    }: {
      heroId: string;
      data: CreateMapData;
    }) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMap = useMutation({
    mutationFn: async ({
      heroId,
      mapId,
    }: {
      heroId: string;
      mapId: string;
    }) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps/${mapId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    updateEvent,
    deleteEvent,
    addHero,
    updateHero,
    deleteHero,
    addMap,
    deleteMap,
  };
};
