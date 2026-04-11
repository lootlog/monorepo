import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { invalidateRespawnQueries } from "./invalidate-respawn-queries";

interface CloseRespawnWindowParams {
  eventId: string;
  heroId: string;
  createNewWindow?: boolean;
  newMinSpawnTime?: string;
  newMaxSpawnTime?: string;
}

interface OpenRespawnWindowParams {
  eventId: string;
  heroId: string;
  minSpawnTime: string;
  maxSpawnTime: string;
}

interface OpenRespawnWindowResult {
  success: boolean;
  minSpawnTime: string;
  maxSpawnTime: string;
}

export const useCloseRespawnWindow = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      heroId,
      createNewWindow,
      newMinSpawnTime,
      newMaxSpawnTime,
    }: CloseRespawnWindowParams) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/close-respawn-window`,
        {
          createNewWindow,
          newMinSpawnTime,
          newMaxSpawnTime,
        },
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      invalidateRespawnQueries(
        queryClient,
        guildId,
        variables.eventId,
        variables.heroId,
      );
    },
  });
};

export const useOpenRespawnWindow = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      heroId,
      minSpawnTime,
      maxSpawnTime,
    }: OpenRespawnWindowParams): Promise<OpenRespawnWindowResult> => {
      const response = await client.post<OpenRespawnWindowResult>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/open-respawn-window`,
        {
          minSpawnTime,
          maxSpawnTime,
        },
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      invalidateRespawnQueries(
        queryClient,
        guildId,
        variables.eventId,
        variables.heroId,
      );
    },
  });
};
