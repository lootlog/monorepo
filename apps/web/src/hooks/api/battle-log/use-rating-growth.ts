import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";

interface RatingGrowthDataPoint {
  date: string;
  ratingDelta: number;
  rating: number;
  battleId: string;
}

interface UseRatingGrowthParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
}

export function useRatingGrowth(params: UseRatingGrowthParams) {
  return useQuery({
    queryKey: ["rating-growth", params],
    queryFn: async () => {
      const response = await battlelogApiClient.get(
        "/battles/@me/statistics/rating-growth",
        {
          params,
        },
      );
      return response.data as RatingGrowthDataPoint[];
    },
    staleTime: 0,
  });
}
