import {
  battleLogStatisticQueryOptions,
  createBattleLogStatistic,
} from "./create-battle-log-statistic";
import type { ProfessionWinRate } from "./use-battle-statistics";

interface UseProfessionWinRateParams {
  characterId?: string;
  world?: string;
  period?: string;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
}

export const professionWinRateQueryOptions = (
  params: UseProfessionWinRateParams,
) =>
  battleLogStatisticQueryOptions<ProfessionWinRate, UseProfessionWinRateParams>(
    {
      queryKey: "profession-win-rate",
      endpoint: "/battles/@me/statistics/profession-win-rate",
      params,
    },
  );

export const useProfessionWinRate = createBattleLogStatistic<
  ProfessionWinRate,
  UseProfessionWinRateParams
>("profession-win-rate", "/battles/@me/statistics/profession-win-rate");
