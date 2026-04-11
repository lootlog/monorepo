import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

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
}

export const battleStreakQueryOptions = (params: UseBattleStreakParams) =>
  queryOptions({
    queryKey: queryKeys.battleLog.streak({
      ...params,
    }),
    queryFn: async () => {
      const requestParams = { ...params };
      const response = await battlelogApiClient.get<Streak>(
        "/battles/@me/statistics/streak",
        {
          params: requestParams,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 0,
  });

export function useBattleStreak(params: UseBattleStreakParams) {
  return useQuery(battleStreakQueryOptions(params));
}
