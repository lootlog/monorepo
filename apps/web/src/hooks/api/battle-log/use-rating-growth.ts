import { createBattleLogStatistic } from "./create-battle-log-statistic";

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

export const useRatingGrowth = createBattleLogStatistic<
  RatingGrowthDataPoint,
  UseRatingGrowthParams
>("rating-growth", "/battles/@me/statistics/rating-growth");
