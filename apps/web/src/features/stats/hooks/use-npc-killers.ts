import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringify } from "qs";

export type NpcInfo = {
  npcId: number;
  npcName: string;
  npcType: string;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  uniqueGuildKills: number;
  totalMemberParticipations: number;
};

export type NpcKiller = {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  participationCount: number;
};

export type NpcKillersResponse = {
  npc: NpcInfo | null;
  killers: NpcKiller[];
};

export type NpcKillersParams = {
  limit?: number;
  world?: string;
};

export const useNpcKillers = (
  npcId: number | undefined,
  params: NpcKillersParams = {},
) => {
  const { limit = 50, world } = params;
  const guildId = useGuildId();
  const { client } = useApiClient();

  const queryParams = stringify(
    { limit, world },
    { skipNulls: true, addQueryPrefix: true },
  );

  return useQuery({
    queryKey: ["npc-killers", guildId, npcId, limit, world],
    queryFn: async () => {
      const response = await client.get<NpcKillersResponse>(
        `/guilds/${guildId}/stats/kills/npcs/${npcId}/killers${queryParams}`,
      );
      return response.data;
    },
    enabled: Boolean(guildId) && npcId !== undefined,
    staleTime: 30000,
  });
};
