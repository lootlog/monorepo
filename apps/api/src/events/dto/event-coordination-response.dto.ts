import { createZodDto } from "nestjs-zod";
import { CoverageGapType } from "src/db/domain";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "src/shared/dto/zod-response-codecs";
import { z } from "zod";

const EventCoordinationPrioritySchema = z.enum([
  "CRITICAL",
  "WARNING",
  "OK",
  "IDLE",
]);

const EventCoordinationWindowStatusSchema = z.enum([
  "OPEN",
  "WAITING",
  "OVERDUE",
  "NONE",
]);

const EventCoordinationRecommendedActionSchema = z.enum([
  "CLOSE_WINDOW",
  "ASSIGN_MAPS",
  "JOIN_MAP",
  "WAIT",
  "NONE",
]);

const EventCoordinationTimerSchema = z.object({
  npcId: z.number(),
  world: z.string(),
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  status: EventCoordinationWindowStatusSchema,
  overdueMs: z.number().nullable(),
});

const EventCoordinationCoverageSchema = z.object({
  totalMaps: z.number(),
  assignedMaps: z.number(),
  coveredMaps: z.number(),
  unassignedMaps: z.number(),
  uncoveredMaps: z.number(),
  activeGapCount: z.number(),
});

const EventCoordinationActiveGapSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  numericMapId: z.number(),
  mapName: z.string(),
  gapType: z.nativeEnum(CoverageGapType),
  startedAt: isoDatetimeCodec,
  durationSeconds: z.number(),
});

const EventCoordinationHeroSchema = z.object({
  heroId: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  npcLvl: z.number().nullable(),
  timer: EventCoordinationTimerSchema.nullable(),
  coverage: EventCoordinationCoverageSchema,
  activeGaps: z.array(EventCoordinationActiveGapSchema),
  priority: EventCoordinationPrioritySchema,
  recommendedAction: EventCoordinationRecommendedActionSchema,
});

const EventCoordinationSummarySchema = z.object({
  criticalCount: z.number(),
  warningCount: z.number(),
  coveredMaps: z.number(),
  totalMaps: z.number(),
  nextSpawnAt: nullableIsoDatetimeCodec,
});

const EventCoordinationResponseSchema = z.object({
  assignmentTimeoutMinutes: z.number(),
  generatedAt: isoDatetimeCodec,
  eventId: z.string(),
  world: z.string(),
  summary: EventCoordinationSummarySchema,
  heroes: z.array(EventCoordinationHeroSchema),
});

export class EventCoordinationResponseDto extends createZodDto(
  EventCoordinationResponseSchema,
  {
    codec: true,
  },
) {}
