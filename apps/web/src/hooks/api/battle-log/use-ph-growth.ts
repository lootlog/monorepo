import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

interface PhGrowthDataPoint {
  date: string;
  ph: number;
  cumulativePh: number;
  battleId: string;
}

interface UsePhGrowthParams {
  characterId?: string;
  world?: string;
  period?: string;
}

export function usePhGrowth(params: UsePhGrowthParams) {
  return useQuery({
    queryKey: ["ph-growth", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get("/battles/@me/statistics/ph-growth", {
        params,
      });
      return response.data as PhGrowthDataPoint[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
