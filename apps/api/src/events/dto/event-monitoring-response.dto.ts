import { createZodDto } from "nestjs-zod";
import { CoverageGapType } from "#src/db/domain";
import { z } from "zod";
import {
  flexibleIsoDatetimeCodec,
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
  nullableFlexibleIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";

const CoverageGapResponseSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  heroNpcId: z.string(),
  gapType: z.nativeEnum(CoverageGapType),
  startedAt: isoDatetimeCodec,
  endedAt: nullableIsoDatetimeCodec,
  durationSeconds: z.number().nullable(),
});

const HeroCoverageGapResponseSchema = CoverageGapResponseSchema.extend({
  map: z.object({
    mapName: z.string(),
    mapId: z.number(),
  }),
});

const KillTimelineAssignmentResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  memberUserId: z.string(),
  assignedAt: flexibleIsoDatetimeCodec,
  unassignedAt: nullableFlexibleIsoDatetimeCodec,
});

const KillTimelineGapResponseSchema = z.object({
  id: z.string(),
  gapType: z.nativeEnum(CoverageGapType),
  startedAt: flexibleIsoDatetimeCodec,
  endedAt: nullableFlexibleIsoDatetimeCodec,
  durationSeconds: z.number().nullable(),
});

const KillTimelineMapResponseSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  numericMapId: z.number(),
  assignments: z.array(KillTimelineAssignmentResponseSchema),
  gaps: z.array(KillTimelineGapResponseSchema),
});

const HeroPresenceStatResponseSchema = z.object({
  memberId: z.number(),
  memberName: z.string(),
  memberAvatar: z.string().nullable(),
  totalTimeSeconds: z.number(),
  afkTimeSeconds: z.number(),
  afkPercentage: z.number(),
});

const HeroPresenceStatsResponseSchema = z.object({
  totalCoverageSeconds: z.number(),
  totalEventSeconds: z.number(),
  presencePercentage: z.number(),
  memberStats: z.array(HeroPresenceStatResponseSchema),
});

const HeroRespawnConfigResponseSchema = z.object({
  hasTimer: z.boolean(),
  windowStatus: z.enum(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  minSpawnTime: nullableIsoDatetimeCodec,
  maxSpawnTime: nullableIsoDatetimeCodec,
  overdueMs: z.number().nullable(),
});

export class CoverageGapResponseDto extends createZodDto(
  CoverageGapResponseSchema,
  {
    codec: true,
  },
) {}

export class NullableCoverageGapResponseDto extends createZodDto(
  CoverageGapResponseSchema.nullable(),
  {
    codec: true,
  },
) {}

export class HeroCoverageGapResponseDto extends createZodDto(
  HeroCoverageGapResponseSchema,
  {
    codec: true,
  },
) {}

export class KillTimelineMapResponseDto extends createZodDto(
  KillTimelineMapResponseSchema,
  {
    codec: true,
  },
) {}

export class HeroPresenceStatsResponseDto extends createZodDto(
  HeroPresenceStatsResponseSchema,
  {
    codec: true,
  },
) {}

export class HeroRespawnConfigResponseDto extends createZodDto(
  HeroRespawnConfigResponseSchema,
  {
    codec: true,
  },
) {}
