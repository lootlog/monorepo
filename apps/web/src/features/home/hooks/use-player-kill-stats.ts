import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { stringifyQueryParams } from "@/lib/stringify-query-params";

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
  topNpcs: TopNpc[];
};

export type PlayerKillStatsFilters = {
  world?: string;
  npcTypes?: NpcType[];
  topNpcsLimit?: number;
  timeBucket?: string;
};

export const usePlayerKillStats = (filters: PlayerKillStatsFilters = {}) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world || undefined,
    npcType: filters.npcTypes?.join(",") || undefined,
    topNpcsLimit: filters.topNpcsLimit || undefined,
    timeBucket: filters.timeBucket || undefined,
  };

  const queryString = stringifyQueryParams(queryParams);

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
