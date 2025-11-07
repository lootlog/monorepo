import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
}

interface UseHeadToHeadParams {
  characterId?: string;
  world?: string;
  period?: string;
  limit?: number;
  sameLevelOnly?: boolean;
}

export function useHeadToHead(params: UseHeadToHeadParams = {}) {
  const { limit = 5, ...restParams } = params;

  return useQuery({
    queryKey: ["head-to-head", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/head-to-head",
        {
          params: { ...restParams, limit },
        },
      );
      return response.data as HeadToHeadRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
