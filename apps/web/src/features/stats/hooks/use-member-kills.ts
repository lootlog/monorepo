import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { stringify } from "qs";
import type { KillsByType, NpcType } from "./use-guild-kill-stats";

export type MemberInfo = {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
};

export type MemberKillsOverview = {
  totalParticipations: number;
  participationsByType: KillsByType;
};

export type MemberNpcKill = {
  npcId: number;
  npcName: string;
  npcType: string;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  totalKills: number;
};

export type MemberKillsPagination = {
  total: number;
  cursor: number;
  limit: number;
  hasNext: boolean;
};

export type MemberKillsResponse = {
  member: MemberInfo | null;
  overview: MemberKillsOverview | null;
  npcs: MemberNpcKill[];
  pagination: MemberKillsPagination | null;
};

export type MemberKillsFilters = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  limit?: number;
  cursor?: number;
  minLvl?: number;
  maxLvl?: number;
};

export const useMemberKills = (
  memberId: number | undefined,
  filters: MemberKillsFilters = {},
) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
    search: filters.search || undefined,
    limit: filters.limit || undefined,
    cursor: filters.cursor || undefined,
    minLvl: filters.minLvl || undefined,
    maxLvl: filters.maxLvl || undefined,
  };

  const queryString = stringify(queryParams, {
    filter: (_, value) => {
      if (value === "" || value === undefined || value === null) {
        return;
      }
      return value;
    },
  });

  return useQuery({
    queryKey: ["member-kills", guildId, memberId, queryString],
    queryFn: async () => {
      const response = await client.get<MemberKillsResponse>(
        `/guilds/${guildId}/stats/kills/members/${memberId}${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    enabled: !!guildId && memberId !== undefined,
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
};
