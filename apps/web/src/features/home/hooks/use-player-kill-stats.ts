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
  characterName: string;
  characterLvl: number;
  characterProf: string | null;
  characterIcon: string | null;
  totalKills: number;
  killsByType: KillsByType;
};

export type TopNpc = {
  npcId: number;
  npcName: string;
  npcType: NpcType;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  totalKills: number;
};

export const TRACKABLE_NPC_TYPES: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
];

export type PlayerKillStatsResponse = {
  overview: PlayerKillStatsOverview;
  characters: CharacterKillStats[];
  topNpcs: TopNpc[];
};

export type PlayerKillStatsFilters = {
  world?: string;
  npcTypes?: NpcType[];
  characterId?: number;
  topNpcsLimit?: number;
};

export const usePlayerKillStats = (filters: PlayerKillStatsFilters = {}) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
    characterId: filters.characterId || undefined,
    topNpcsLimit: filters.topNpcsLimit || undefined,
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
