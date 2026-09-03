export interface EventWrappedRarityTotalsDto {
  unique: number;
  heroic: number;
  legendary: number;
}

export interface EventWrappedLeaderDto {
  memberId: number;
  name: string;
  avatar: string | null;
  primaryValue: number;
  secondaryValue?: number | null;
}

export interface EventWrappedLeaderResultDto {
  winner: EventWrappedLeaderDto | null;
  candidateCount: number;
  tiedWinnerCount: number;
}

export interface EventWrappedHeroCoverageDto {
  heroNpcId: string;
  npcName: string;
  npcIcon: string | null;
  mapCount: number;
  totalKills: number;
  coveragePercentage: number;
}

export interface EventWrappedHeroDto {
  heroNpcId: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  mapCount: number;
  totalKills: number;
  totalPoints: number;
  coveragePercentage: number;
  rarityTotals: EventWrappedRarityTotalsDto;
  topHunter: EventWrappedLeaderResultDto;
}

export interface EventWrappedLootHeroDto {
  heroNpcId: string;
  npcName: string;
  npcIcon: string | null;
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotalsDto;
}

export interface EventWrappedEventDto {
  id: string;
  name: string;
  world: string;
  startsAt: string | null;
  endsAt: string | null;
  heroCount: number;
  mapCount: number;
  spawnCount: number;
}

export interface EventWrappedOverviewDto {
  totalKills: number;
  participantCount: number;
  totalPoints: number;
  totalTrackedSeconds: number;
  totalAfkSeconds: number;
  coveragePercentage: number;
  avgMapsPerSpawnWindow: number;
  busiestHour: number | null;
  busiestHourKills: number;
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotalsDto;
}

export interface EventWrappedLeadersDto {
  topHunter: EventWrappedLeaderResultDto;
  topScorer: EventWrappedLeaderResultDto;
  longestDuty: EventWrappedLeaderResultDto;
  topAfk: EventWrappedLeaderResultDto;
  mostFlexible: EventWrappedLeaderResultDto;
  topEfficiency: EventWrappedLeaderResultDto;
}

export interface EventWrappedCoverageDto {
  totalWindowCount: number;
  totalWindowSeconds: number;
  totalCoverageSeconds: number;
  totalUncoveredSeconds: number;
  totalUnassignedSeconds: number;
  coveragePercentage: number;
  avgMapsPerSpawnWindow: number;
  bestHeroCoverage: EventWrappedHeroCoverageDto | null;
  roughestHeroCoverage: EventWrappedHeroCoverageDto | null;
}

export interface EventWrappedLootDto {
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotalsDto;
  heroBreakdown: EventWrappedLootHeroDto[];
}

export interface EventWrappedResponseDto {
  generatedAt: string;
  event: EventWrappedEventDto;
  overview: EventWrappedOverviewDto;
  leaders: EventWrappedLeadersDto;
  coverage: EventWrappedCoverageDto;
  heroes: EventWrappedHeroDto[];
  loot: EventWrappedLootDto;
}
