import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

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
}

export function useBattleDuration(params: UseBattleDurationParams) {
  return useQuery({
    queryKey: ["battle-duration", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get("/battles/@me/statistics/duration", {
        params,
      });
      return response.data as BattleDurationStats;
    },
    staleTime: 5 * 60 * 1000,
  });
}
