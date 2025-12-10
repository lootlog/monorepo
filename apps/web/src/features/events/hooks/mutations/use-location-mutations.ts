import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateLocationData {
  name: string;
}

interface UpdateLocationData {
  name?: string;
}

interface ReorderLocationsData {
  locationIds: string[];
}

interface AssignMapLocationData {
  locationId: string | null;
}

export const useLocationMutations = (
  guildId: string,
  eventId: string,
  heroId: string,
) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const queryKey = ["event", guildId, eventId];

  const createLocation = useMutation({
    mutationFn: async (data: CreateLocationData) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/locations`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({
      locationId,
      data,
    }: {
      locationId: string;
      data: UpdateLocationData;
    }) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/locations/${locationId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/locations/${locationId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const reorderLocations = useMutation({
    mutationFn: async (data: ReorderLocationsData) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/locations/reorder`,
        data,
      );
      return response.data;
    },
    onMutate: async (data: ReorderLocationsData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousEvent = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        const updatedHeroNpcs = old.heroNpcs?.map((hero: any) => {
          if (hero.id !== heroId) return hero;

          // Reorder locations based on the new order
          const reorderedLocations = data.locationIds
            .map((id, index) => {
              const location = hero.locations?.find((l: any) => l.id === id);
              return location ? { ...location, order: index } : null;
            })
            .filter(Boolean);

          return { ...hero, locations: reorderedLocations };
        });

        return { ...old, heroNpcs: updatedHeroNpcs };
      });

      return { previousEvent };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(queryKey, context.previousEvent);
      }
    },
  });

  const assignMapToLocation = useMutation({
    mutationFn: async ({
      mapId,
      data,
    }: {
      mapId: string;
      data: AssignMapLocationData;
    }) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps/${mapId}/location`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  return {
    createLocation,
    updateLocation,
    deleteLocation,
    reorderLocations,
    assignMapToLocation,
  };
};
