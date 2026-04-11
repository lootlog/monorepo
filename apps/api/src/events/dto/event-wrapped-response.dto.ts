import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const EventWrappedRarityTotalsResponseSchema = z.object({
  unique: z.number(),
  heroic: z.number(),
  legendary: z.number(),
});

const EventWrappedLeaderResponseSchema = z.object({
  memberId: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  primaryValue: z.number(),
  secondaryValue: z.number().nullable().optional(),
});

const EventWrappedHeroCoverageResponseSchema = z.object({
  heroNpcId: z.string(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  mapCount: z.number(),
  totalKills: z.number(),
  coveragePercentage: z.number(),
});

const EventWrappedHeroResponseSchema = z.object({
  heroNpcId: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  mapCount: z.number(),
  totalKills: z.number(),
  totalPoints: z.number(),
  coveragePercentage: z.number(),
  rarityTotals: EventWrappedRarityTotalsResponseSchema,
  topHunter: EventWrappedLeaderResponseSchema.nullable(),
});

const EventWrappedLootHeroResponseSchema = z.object({
  heroNpcId: z.string(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  totalLoots: z.number(),
  rarityTotals: EventWrappedRarityTotalsResponseSchema,
});

const EventWrappedEventResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  world: z.string(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  heroCount: z.number(),
  mapCount: z.number(),
  spawnCount: z.number(),
});

const EventWrappedOverviewResponseSchema = z.object({
  totalKills: z.number(),
  participantCount: z.number(),
  totalPoints: z.number(),
  totalTrackedSeconds: z.number(),
  totalAfkSeconds: z.number(),
  coveragePercentage: z.number(),
  avgMapsPerSpawnWindow: z.number(),
  busiestHour: z.number().nullable(),
  busiestHourKills: z.number(),
  totalLoots: z.number(),
  rarityTotals: EventWrappedRarityTotalsResponseSchema,
});

const EventWrappedLeadersResponseSchema = z.object({
  topHunter: EventWrappedLeaderResponseSchema.nullable(),
  topScorer: EventWrappedLeaderResponseSchema.nullable(),
  longestDuty: EventWrappedLeaderResponseSchema.nullable(),
  topAfk: EventWrappedLeaderResponseSchema.nullable(),
  mostFlexible: EventWrappedLeaderResponseSchema.nullable(),
  topEfficiency: EventWrappedLeaderResponseSchema.nullable(),
});

const EventWrappedCoverageResponseSchema = z.object({
  totalWindowCount: z.number(),
  totalWindowSeconds: z.number(),
  totalCoverageSeconds: z.number(),
  totalUncoveredSeconds: z.number(),
  totalUnassignedSeconds: z.number(),
  coveragePercentage: z.number(),
  avgMapsPerSpawnWindow: z.number(),
  bestHeroCoverage: EventWrappedHeroCoverageResponseSchema.nullable(),
  roughestHeroCoverage: EventWrappedHeroCoverageResponseSchema.nullable(),
});

const EventWrappedLootResponseSchema = z.object({
  totalLoots: z.number(),
  rarityTotals: EventWrappedRarityTotalsResponseSchema,
  heroBreakdown: z.array(EventWrappedLootHeroResponseSchema),
});

export class EventWrappedApiResponseDto extends createZodDto(
  z.object({
    generatedAt: z.iso.datetime(),
    event: EventWrappedEventResponseSchema,
    overview: EventWrappedOverviewResponseSchema,
    leaders: EventWrappedLeadersResponseSchema,
    coverage: EventWrappedCoverageResponseSchema,
    heroes: z.array(EventWrappedHeroResponseSchema),
    loot: EventWrappedLootResponseSchema,
  }),
) {}
