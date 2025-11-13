import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

export interface RatingDeltaByOpponentRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  totalRatingDelta: number;
  wins: number;
  losses: number;
  totalBattles: number;
  avgRatingDelta: number;
  lastBattleDate: string;
}

interface UseRatingDeltaByOpponentParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
}

export function useRatingDeltaByOpponent(
  params: UseRatingDeltaByOpponentParams,
) {
  return useQuery({
    queryKey: ["rating-delta-by-opponent", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/rating-delta-by-opponent",
        {
          params,
        },
      );
      return response.data as RatingDeltaByOpponentRecord[];
    },
    staleTime: 0,
  });
}
