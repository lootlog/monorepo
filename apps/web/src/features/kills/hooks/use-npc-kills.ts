import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { stringify } from "qs";
import type { NpcType } from "@/features/home/hooks/use-player-kill-stats";

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
  characterId?: number;
  search?: string;
  cursor?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
};

export const useNpcKills = (filters: NpcKillsFilters = {}) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
    characterId: filters.characterId || undefined,
    search: filters.search || undefined,
    cursor: filters.cursor || undefined,
    limit: filters.limit || undefined,
    sortOrder: filters.sortOrder || undefined,
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
