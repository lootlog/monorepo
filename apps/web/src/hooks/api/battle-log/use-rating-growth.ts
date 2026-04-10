import {
  battleLogStatisticQueryOptions,
  createBattleLogStatistic,
} from "./create-battle-log-statistic";

export interface RatingGrowthDataPoint {
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

export const ratingGrowthQueryOptions = (params: UseRatingGrowthParams) =>
  battleLogStatisticQueryOptions<RatingGrowthDataPoint, UseRatingGrowthParams>({
    queryKey: "rating-growth",
    endpoint: "/battles/@me/statistics/rating-growth",
    params,
  });

export const useRatingGrowth = createBattleLogStatistic<
  RatingGrowthDataPoint,
  UseRatingGrowthParams
>("rating-growth", "/battles/@me/statistics/rating-growth");
