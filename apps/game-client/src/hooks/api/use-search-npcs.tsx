import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { NpcType } from "@/hooks/api/use-npcs";

export type NpcSearchResult = {
  npcId: number;
  name: string;
  lvl: number;
  type: NpcType;
  prof: string;
  location: string;
  wt: string | number;
  icon: string;
  latestRespBaseSeconds: number;
  latestRespawnRandomness: number;
};

export const useSearchNpcs = (
  guildId: string,
  world: string,
  search: string,
  enabled: boolean = true,
) => {
  const { client } = useAuthenticatedApiClient();

  return useQuery({
    queryKey: ["search-npcs", guildId, world, search],
    queryFn: async () => {
      const response = await client.get<NpcSearchResult[]>(
        `/guilds/${guildId}/timers/npcs/search`,
        {
          params: {
            world,
            search,
            limit: 10,
          },
        },
      );
      return response.data;
    },
    enabled: enabled && search.length >= 2,
    staleTime: 60000,
  });
};
