import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

interface Streak {
  current: {
    type: "wins" | "losses" | "none";
    count: number;
  };
  longest: {
    wins: number;
    losses: number;
  };
}

interface UseBattleStreakParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  suppressRouteErrorToast?: boolean;
}

export const battleStreakQueryOptions = (params: UseBattleStreakParams) =>
  queryOptions({
    queryKey: [
      "battle-streak",
      {
        ...params,
        suppressRouteErrorToast: undefined,
      },
    ],
    queryFn: async () => {
      const { suppressRouteErrorToast = false, ...requestParams } = params;
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/streak",
        {
          params: requestParams,
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data as Streak;
    },
    staleTime: 0,
  });

export function useBattleStreak(params: UseBattleStreakParams) {
  return useQuery(battleStreakQueryOptions(params));
}
