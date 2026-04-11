import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EventWrappedRarityTotals {
  unique: number;
  heroic: number;
  legendary: number;
}

export interface EventWrappedLeader {
  memberId: number;
  name: string;
  avatar: string | null;
  primaryValue: number;
  secondaryValue?: number | null;
}

export interface EventWrappedHeroCoverage {
  heroNpcId: string;
  npcName: string;
  npcIcon: string | null;
  mapCount: number;
  totalKills: number;
  coveragePercentage: number;
}

export interface EventWrappedHero {
  heroNpcId: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  mapCount: number;
  totalKills: number;
  totalPoints: number;
  coveragePercentage: number;
  rarityTotals: EventWrappedRarityTotals;
  topHunter: EventWrappedLeader | null;
}

export interface EventWrappedLootHero {
  heroNpcId: string;
  npcName: string;
  npcIcon: string | null;
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotals;
}

export interface EventWrapped {
  generatedAt: string;
  event: {
    id: string;
    name: string;
    world: string;
    startsAt: string | null;
    endsAt: string | null;
    heroCount: number;
    mapCount: number;
    spawnCount: number;
  };
  overview: {
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
    rarityTotals: EventWrappedRarityTotals;
  };
  leaders: {
    topHunter: EventWrappedLeader | null;
    topScorer: EventWrappedLeader | null;
    longestDuty: EventWrappedLeader | null;
    topAfk: EventWrappedLeader | null;
    mostFlexible: EventWrappedLeader | null;
    topEfficiency: EventWrappedLeader | null;
  };
  coverage: {
    totalWindowCount: number;
    totalWindowSeconds: number;
    totalCoverageSeconds: number;
    totalUncoveredSeconds: number;
    totalUnassignedSeconds: number;
    coveragePercentage: number;
    avgMapsPerSpawnWindow: number;
    bestHeroCoverage: EventWrappedHeroCoverage | null;
    roughestHeroCoverage: EventWrappedHeroCoverage | null;
  };
  heroes: EventWrappedHero[];
  loot: {
    totalLoots: number;
    rarityTotals: EventWrappedRarityTotals;
    heroBreakdown: EventWrappedLootHero[];
  };
}

interface UseEventWrappedOptions {
  guildId: string;
  eventId: string;
  enabled?: boolean;
}

export const useEventWrapped = ({
  guildId,
  eventId,
  enabled = true,
}: UseEventWrappedOptions) => {
  const { client } = useApiClient();

  return useQuery<EventWrapped>({
    queryKey: queryKeys.events.wrapped(guildId, eventId),
    queryFn: async () => {
      const response = await client.get<EventWrapped>(
        `/guilds/${guildId}/events/${eventId}/wrapped`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && enabled,
    staleTime: 5 * 60 * 1000,
  });
};
