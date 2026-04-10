import { queryOptions, useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import { stringify } from "qs";
import { queryKeys } from "@/lib/query-keys";

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

export const npcKillersQueryOptions = (
  guildId: string,
  npcId: number | undefined,
  params: NpcKillersParams = {},
) => {
  const { limit = 50, world } = params;
  const queryParams = stringify(
    { limit, world },
    { skipNulls: true, addQueryPrefix: true },
  );

  return queryOptions({
    queryKey: queryKeys.stats.npcKillers(guildId, npcId, limit, world),
    queryFn: async () => {
      const response = await apiClient.get<NpcKillersResponse>(
        `/guilds/${guildId}/stats/kills/npcs/${npcId}/killers${queryParams}`,
      );
      return response;
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
