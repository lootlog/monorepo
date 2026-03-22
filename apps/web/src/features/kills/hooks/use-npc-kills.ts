import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { NpcType } from "@/features/home/hooks/use-player-kill-stats";
import { stringifyQueryParams } from "@/lib/stringify-query-params";

export type NpcKill = {
  npcId: number;
  npcName: string;
  npcType: NpcType;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  totalKills: number;
};

export type NpcKillsPagination = {
  total: number;
  cursor: number;
  limit: number;
  hasNext: boolean;
};

export type NpcKillsResponse = {
  npcs: NpcKill[];
  pagination: NpcKillsPagination;
};

export type NpcKillsFilters = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  cursor?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  sortBy?: "kills" | "level";
  minLvl?: number;
  maxLvl?: number;
};

export const useNpcKills = (filters: NpcKillsFilters = {}) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
    search: filters.search || undefined,
    cursor: filters.cursor || undefined,
    limit: filters.limit || undefined,
    sortOrder: filters.sortOrder || undefined,
    sortBy: filters.sortBy || undefined,
    minLvl: filters.minLvl || undefined,
    maxLvl: filters.maxLvl || undefined,
  };

  const queryString = stringifyQueryParams(queryParams);

  return useQuery({
    queryKey: ["npc-kills", queryString],
    queryFn: async () => {
      const response = await client.get<NpcKillsResponse>(
        `/users/@me/kills/npcs${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    staleTime: 30000,
  });
};
