import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

export type WindowStatus = "OPEN" | "WAITING" | "NONE";

export interface RespawnConfig {
  hasTimer: boolean;
  windowStatus: WindowStatus;
  minSpawnTime: string | null;
  maxSpawnTime: string | null;
  defaultRespBaseSeconds: number;
  defaultRespRandomness: number;
}

export const useHeroRespawnConfig = (eventId: string, heroId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<RespawnConfig>({
    queryKey: ["hero-respawn-config", guildId, eventId, heroId],
    queryFn: async () => {
      const response = await client.get<RespawnConfig>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/respawn-config`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!heroId,
    staleTime: 10000,
    refetchInterval: 30000,
  });
};
