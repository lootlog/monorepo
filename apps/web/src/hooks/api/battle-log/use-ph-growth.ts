import {
  battleLogStatisticQueryOptions,
  createBattleLogStatistic,
} from "./create-battle-log-statistic";

export interface PhGrowthDataPoint {
  date: string;
  ph: number;
  cumulativePh: number;
  battleId: string;
}

interface UsePhGrowthParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  suppressRouteErrorToast?: boolean;
}

export const phGrowthQueryOptions = (params: UsePhGrowthParams) =>
  battleLogStatisticQueryOptions<PhGrowthDataPoint, UsePhGrowthParams>({
    queryKey: "ph-growth",
    endpoint: "/battles/@me/statistics/ph-growth",
    params,
    suppressRouteErrorToast: params.suppressRouteErrorToast,
  });

export const usePhGrowth = createBattleLogStatistic<
  PhGrowthDataPoint,
  UsePhGrowthParams
>("ph-growth", "/battles/@me/statistics/ph-growth");
