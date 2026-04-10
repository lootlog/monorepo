import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  suppressRouteErrorToast?: boolean;
}

export const ratingDeltaByOpponentQueryOptions = (
  params: UseRatingDeltaByOpponentParams,
) =>
  queryOptions({
    queryKey: queryKeys.battleLog.ratingDeltaByOpponent({
      ...params,
      suppressRouteErrorToast: undefined,
    }),
    queryFn: async () => {
      const { suppressRouteErrorToast = false, ...requestParams } = params;
      const response = await battlelogApiClient.get<
        RatingDeltaByOpponentRecord[]
      >("/battles/@me/statistics/rating-delta-by-opponent", {
        params: requestParams,
        suppressRouteErrorToast,
      } as ApiRequestConfig);
      return response;
    },
    staleTime: 0,
  });

export function useRatingDeltaByOpponent(
  params: UseRatingDeltaByOpponentParams,
) {
  return useQuery(ratingDeltaByOpponentQueryOptions(params));
}
