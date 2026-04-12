import { queryOptions, useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";
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
    queryKey: queryKeys.battleLog.streak(params),
    queryFn: async () => {
      const response = await battlelogApiClient.get<Streak>(
        "/battles/@me/statistics/streak",
        {
          params: { ...params },
        },
      );
      return response;
    },
    staleTime: 0,
  });

export function useBattleStreak(params: UseBattleStreakParams) {
  return useQuery(battleStreakQueryOptions(params));
}
