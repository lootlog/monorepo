import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

interface BattleDurationStats {
  avgWinDuration: number;
  avgLossDuration: number;
  fastest: {
    duration: number;
    battleId: string;
  } | null;
  longest: {
    duration: number;
    battleId: string;
  } | null;
}

interface UseBattleDurationParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  suppressRouteErrorToast?: boolean;
}

export const battleDurationQueryOptions = (params: UseBattleDurationParams) =>
  queryOptions({
    queryKey: queryKeys.battleLog.duration({
      ...params,
      suppressRouteErrorToast: undefined,
    }),
    queryFn: async () => {
      const { suppressRouteErrorToast = false, ...requestParams } = params;
      const response = await battlelogApiClient.get<BattleDurationStats>(
        "/battles/@me/statistics/duration",
        {
          params: requestParams,
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 0,
  });

export function useBattleDuration(params: UseBattleDurationParams) {
  return useQuery(battleDurationQueryOptions(params));
}
