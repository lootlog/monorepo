import { queryOptions, useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

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
  suppressRouteErrorToast?: boolean;
};

export const battleAnalyticsQueryOptions = (
  params: GetBattleAnalyticsParams = {},
) => {
  const { suppressRouteErrorToast = false, ...requestParams } = params;

  return queryOptions({
    queryKey: queryKeys.battleLog.analytics(requestParams),
    queryFn: async () => {
      const response = await battlelogApiClient.get<BattleAnalytics>(
        `/battles/@me/analytics`,
        {
          params: requestParams,
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 0,
  });
};

export const useBattleAnalytics = (params: GetBattleAnalyticsParams = {}) => {
  useBattleLogApiClient();

  return useQuery(battleAnalyticsQueryOptions(params));
};
