export interface ProfessionWinRateDto {
  prof: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
}

export interface HeadToHeadRecordDto {
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

export interface StreakDto {
  current: {
    type: 'wins' | 'losses' | 'none';
    count: number;
  };
  longest: {
    wins: number;
    losses: number;
  };
}

export interface BattleDurationStatsDto {
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

export interface PhGrowthDataPointDto {
  date: string;
  ph: number;
  cumulativePh: number;
  battleId: string;
}

export interface HeadToHeadPaginatedResponseDto {
  records: HeadToHeadRecordDto[];
  pagination: {
    size: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    previousCursor?: string;
    total?: number;
  };
  meta: {
    performance: {
      queryTime: number;
      countTime?: number;
      totalItems?: number;
      estimatedTotal?: boolean;
    };
  };
}

export interface BattleStatisticsResponseDto {
  professionWinRate: ProfessionWinRateDto[];
  headToHead: HeadToHeadRecordDto[];
  streak: StreakDto;
  duration: BattleDurationStatsDto;
}
