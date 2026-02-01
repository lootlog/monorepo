import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringify } from "qs";

export type TopNpc = {
  npcId: number;
  npcName: string;
  npcType: string;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  uniqueKills: number;
};

export type GuildTopNpcsResponse = {
  topNpcs: TopNpc[];
};

export type GuildTopNpcsParams = {
  limit?: number;
  npcType?: string;
  world?: string;
  search?: string;
};

export const useGuildTopNpcs = (params: GuildTopNpcsParams = {}) => {
  const { limit = 10, npcType, world, search } = params;
  const guildId = useGuildId();
  const { client } = useApiClient();

  const queryParams = stringify(
    { limit, npcType, world, search },
    { skipNulls: true, addQueryPrefix: true },
  );

  return useQuery({
    queryKey: ["guild-top-npcs", guildId, limit, npcType, world, search],
    queryFn: async () => {
      const response = await client.get<GuildTopNpcsResponse>(
        `/guilds/${guildId}/stats/kills/top-npcs${queryParams}`,
      );
      return response.data;
    },
    enabled: !!guildId,
    staleTime: 30000,
  });
};
