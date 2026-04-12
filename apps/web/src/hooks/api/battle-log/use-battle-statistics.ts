import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ProfessionWinRate {
  prof: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
}

export interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
}

export interface Streak {
  current: {
    type: "wins" | "losses" | "none";
    count: number;
  };
  longest: {
    wins: number;
    losses: number;
  };
}

export interface BattleDurationStats {
  avgWinDuration: number;
  avgLossDuration: number;
  fastest: {
    duration: number;
    battleId: string;
  } | null;
  longest: {
    duration: number;
    battleId: string;
  } | null;
}

export interface BattleStatistics {
  professionWinRate: ProfessionWinRate[];
  headToHead: HeadToHeadRecord[];
  streak: Streak;
  duration: BattleDurationStats;
}

export interface UseBattleStatisticsParams {
  characterId?: string;
  world?: string;
  period?: "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";
}

export const useBattleStatistics = (params?: UseBattleStatisticsParams) => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: queryKeys.battleLog.statistics(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();

      if (params?.characterId)
        searchParams.append("characterId", params.characterId);
      if (params?.world) searchParams.append("world", params.world);
      if (params?.period) searchParams.append("period", params.period);

      return client.get<BattleStatistics>(
        `/battles/@me/statistics?${searchParams}`,
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  return query;
};
