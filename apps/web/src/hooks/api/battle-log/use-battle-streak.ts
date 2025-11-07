import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

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
  sameLevelOnly?: boolean;
}

export function useBattleStreak(params: UseBattleStreakParams) {
  return useQuery({
    queryKey: ["battle-streak", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/streak",
        {
          params,
        },
      );
      return response.data as Streak;
    },
    staleTime: 5 * 60 * 1000,
  });
}
