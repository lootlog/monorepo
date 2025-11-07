import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

interface ProfessionWinRate {
  prof: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
}

interface UseProfessionWinRateParams {
  characterId?: string;
  world?: string;
  period?: string;
  sameLevelOnly?: boolean;
}

export function useProfessionWinRate(params: UseProfessionWinRateParams) {
  return useQuery({
    queryKey: ["profession-win-rate", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/profession-win-rate",
        {
          params,
        },
      );
      return response.data as ProfessionWinRate[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
