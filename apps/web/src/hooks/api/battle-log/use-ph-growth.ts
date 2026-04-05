import { createBattleLogStatistic } from "./create-battle-log-statistic";

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
}

export const usePhGrowth = createBattleLogStatistic<
  PhGrowthDataPoint,
  UsePhGrowthParams
>("ph-growth", "/battles/@me/statistics/ph-growth");
