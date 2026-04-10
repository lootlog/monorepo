import {
  battleLogStatisticQueryOptions,
  createBattleLogStatistic,
} from "./create-battle-log-statistic";

export interface ProfessionWinRate {
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
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  matchmaking?: boolean;
  suppressRouteErrorToast?: boolean;
}

export const professionWinRateQueryOptions = (
  params: UseProfessionWinRateParams,
) =>
  battleLogStatisticQueryOptions<ProfessionWinRate, UseProfessionWinRateParams>(
    {
      queryKey: "profession-win-rate",
      endpoint: "/battles/@me/statistics/profession-win-rate",
      params,
      suppressRouteErrorToast: params.suppressRouteErrorToast,
    },
  );

export const useProfessionWinRate = createBattleLogStatistic<
  ProfessionWinRate,
  UseProfessionWinRateParams
>("profession-win-rate", "/battles/@me/statistics/profession-win-rate");
