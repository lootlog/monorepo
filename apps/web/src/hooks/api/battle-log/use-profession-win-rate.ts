import { createBattleLogStatistic } from "./create-battle-log-statistic";

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
}

export const useProfessionWinRate = createBattleLogStatistic<
  ProfessionWinRate,
  UseProfessionWinRateParams
>("profession-win-rate", "/battles/@me/statistics/profession-win-rate");
