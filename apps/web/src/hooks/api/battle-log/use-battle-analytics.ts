import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { battlelogApiClient } from "@/lib/api-client/api-client";

export type BattleAnalytics = {
  totalBattles: number;
  wins: number;
  losses: number;
  winRatio: number;
  totalPH: number;
};

export type GetBattleAnalyticsParams = {
  characterId?: string;
  world?: string;
  period?: "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d";
  minLevel?: number;
  maxLevel?: number;
};

export const battleAnalyticsQueryOptions = (
  params: GetBattleAnalyticsParams = {},
) => {
  return queryOptions({
    queryKey: queryKeys.battleLog.analytics(params),
    queryFn: async () => {
      const response = await battlelogApiClient.get<BattleAnalytics>(
        `/battles/@me/analytics`,
        {
          params: { ...params },
        },
      );
      return response;
    },
    staleTime: 0,
  });
};

export const useBattleAnalytics = (params: GetBattleAnalyticsParams = {}) => {
  return useQuery(battleAnalyticsQueryOptions(params));
};
