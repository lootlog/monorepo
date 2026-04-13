import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { stringifyQueryParams } from "@/lib/stringify-query-params";
import { queryKeys } from "@/lib/query-keys";

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

export type DashboardKillStatsOverview = {
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

export type DashboardKillStatsResponse = {
  overview: DashboardKillStatsOverview;
  topNpcs: TopNpc[];
};

export type DashboardKillStatsFilters = {
  world?: string;
  npcTypes?: NpcType[];
  topNpcsLimit?: number;
};

export const useDashboardKillStats = (
  filters: DashboardKillStatsFilters = {},
) => {
  const { client } = useApiClient();

  const queryParams = {
    world: filters.world ?? undefined,
    npcType: filters.npcTypes?.join(",") ?? undefined,
    topNpcsLimit: filters.topNpcsLimit ?? undefined,
  };

  const queryString = stringifyQueryParams(queryParams);

  return useQuery({
    queryKey: queryKeys.stats.playerKillStats(queryString),
    queryFn: async () => {
      const response = await client.get<DashboardKillStatsResponse>(
        `/users/@me/stats/kills${queryString ? `?${queryString}` : ""}`,
      );
      return response;
    },
    staleTime: 30000,
  });
};
