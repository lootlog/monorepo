import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { stringify } from "qs";

export type NpcType =
  | "COMMON"
  | "ELITE"
  | "ELITE2"
  | "ELITE3"
  | "HERO"
  | "EVENT_HERO"
  | "TITAN"
  | "COLOSSUS"
  | "NPC";

export type KillsByType = Partial<Record<NpcType, number>>;

export type PlayerKillStatsOverview = {
  totalKills: number;
  killsByType: KillsByType;
  killsByWorld: Record<string, number>;
};

export type CharacterKillStats = {
  characterId: number;
  totalKills: number;
  killsByType: KillsByType;
};

export type PlayerKillStatsResponse = {
  overview: PlayerKillStatsOverview;
  characters: CharacterKillStats[];
};

export type PlayerKillStatsFilters = {
  world?: string;
  npcTypes?: NpcType[];
};

export const usePlayerKillStats = (filters: PlayerKillStatsFilters = {}) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
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
    queryKey: ["player-kill-stats", queryString],
    queryFn: async () => {
      const response = await client.get<PlayerKillStatsResponse>(
        `/users/@me/stats/kills${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    staleTime: 30000,
  });
};
