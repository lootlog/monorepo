import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

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

export const useBattleAnalytics = (params: GetBattleAnalyticsParams = {}) => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battle-analytics", "@me", params],
    queryFn: () => {
      return client.get<BattleAnalytics>(`/battles/@me/analytics`, {
        params,
      });
    },
    select: (response) => response.data,
    staleTime: 0,
  });

  return query;
};
