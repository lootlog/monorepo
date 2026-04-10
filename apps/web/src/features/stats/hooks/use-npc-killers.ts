import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
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

type NpcKillersQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const npcKillersQueryOptions = (
  guildId: string,
  npcId: number | undefined,
  params: NpcKillersParams = {},
  { suppressRouteErrorToast = false }: NpcKillersQueryOptionsOptions = {},
) => {
  const { limit = 50, world } = params;
  const queryParams = stringify(
    { limit, world },
    { skipNulls: true, addQueryPrefix: true },
  );

  return queryOptions({
    queryKey: ["npc-killers", guildId, npcId, limit, world],
    queryFn: async () => {
      const response = await apiClient.get<NpcKillersResponse>(
        `/guilds/${guildId}/stats/kills/npcs/${npcId}/killers${queryParams}`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data;
    },
    enabled: !!guildId && npcId !== undefined,
    staleTime: 30000,
  });
};

export const useNpcKillers = (
  npcId: number | undefined,
  params: NpcKillersParams = {},
) => {
  const guildId = useGuildId();

  return useQuery(npcKillersQueryOptions(guildId ?? "", npcId, params));
};
