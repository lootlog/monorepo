import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { EVENT_SCORING_MODES } from "../constants/scoring-rules.constant";
import {
  isoDatetimeCodec,
  jsonValueSchema,
} from "src/shared/dto/zod-response-codecs";

const EventKillHeroNpcResponseSchema = z.object({
  id: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  npcLvl: z.number().nullable(),
});

const EventKillParticipantMemberResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  userId: z.string(),
});

const EventKillParticipantRoleResponseSchema = z.object({
  position: z.number().nullable(),
  color: z.number().nullable(),
});

const EventKillParticipantMapDataResponseSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  assignedAt: z.iso.datetime(),
  unassignedAt: z.iso.datetime().nullable(),
  assignmentDurationSeconds: z.number(),
  presenceTimeSeconds: z.number(),
  afkTimeSeconds: z.number(),
});

const EventKillParticipantResponseSchema = z.object({
  id: z.string(),
  memberId: z.number(),
  points: z.number(),
  basePoints: z.number(),
  manualAdjustmentPoints: z.number().nullable().optional(),
  trackingDurationSeconds: z.number().nullable(),
  trackingDurationPercentage: z.number().nullable(),
  timeOnMapSeconds: z.number(),
  afkPercentage: z.number(),
  wasPresent: z.boolean(),
  bonusBreakdown: jsonValueSchema.nullable().optional(),
  member: EventKillParticipantMemberResponseSchema,
  mapData: z.array(EventKillParticipantMapDataResponseSchema).optional(),
});

const EventKillHistoryEntryResponseSchema = z.object({
  id: z.string(),
  heroNpcId: z.string(),
  killedAt: isoDatetimeCodec,
  minSpawnTimeAtKill: isoDatetimeCodec,
  maxSpawnTimeAtKill: isoDatetimeCodec,
  isManualClose: z.boolean(),
  heroNpc: EventKillHeroNpcResponseSchema,
  points: z.array(EventKillParticipantResponseSchema),
});

const EventKillHistoryResponseSchema = z.object({
  data: z.array(EventKillHistoryEntryResponseSchema),
  nextCursor: z.string().nullable(),
});

const EventMemberKillHistoryEntryResponseSchema = z.object({
  id: z.string(),
  heroNpcId: z.string(),
  killedAt: isoDatetimeCodec,
  minSpawnTimeAtKill: isoDatetimeCodec,
  maxSpawnTimeAtKill: isoDatetimeCodec,
  isManualClose: z.boolean(),
  heroNpc: EventKillHeroNpcResponseSchema,
  memberPoint: EventKillParticipantResponseSchema.nullable(),
});

const EventMemberKillHistoryResponseSchema = z.object({
  member: EventKillParticipantMemberResponseSchema,
  data: z.array(EventMemberKillHistoryEntryResponseSchema),
  nextCursor: z.string().nullable(),
});

const KillDetailParticipantMemberResponseSchema =
  EventKillParticipantMemberResponseSchema.extend({
    roles: z.array(EventKillParticipantRoleResponseSchema),
  });

const KillDetailParticipantResponseSchema =
  EventKillParticipantResponseSchema.extend({
    member: KillDetailParticipantMemberResponseSchema,
  });

const KillDetailHeroNpcResponseSchema = EventKillHeroNpcResponseSchema.extend({
  event: z.object({
    id: z.string(),
    name: z.string(),
    world: z.string(),
  }),
});

const KillDetailMemberResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  userId: z.string(),
});

const KillDetailResponseSchema = z.object({
  kill: z.object({
    id: z.string(),
    heroNpcId: z.string(),
    killedAt: isoDatetimeCodec,
    minSpawnTimeAtKill: isoDatetimeCodec,
    maxSpawnTimeAtKill: isoDatetimeCodec,
    timerCreatedById: z.number().nullable(),
    isManualClose: z.boolean(),
    respawnDurationSeconds: z.number().nullable(),
    windowDurationSeconds: z.number().nullable(),
    resolvedAfterMaxSpawnTimeMs: z.number().nullable(),
    heroNpc: KillDetailHeroNpcResponseSchema,
    timerCreatedBy: KillDetailMemberResponseSchema.nullable(),
    points: z.array(KillDetailParticipantResponseSchema),
  }),
  eventConfig: z.object({
    scoringMode: z.enum(EVENT_SCORING_MODES),
    scoringRules: jsonValueSchema.nullable(),
  }),
});

const EventHeroStatsResponseSchema = z.object({
  heroId: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcLvl: z.number().nullable(),
  killCount: z.number(),
});

export class EventKillParticipantResponseDto extends createZodDto(
  EventKillParticipantResponseSchema,
  {
    codec: true,
  },
) {}

export class EventKillHistoryResponseDto extends createZodDto(
  EventKillHistoryResponseSchema,
  {
    codec: true,
  },
) {}

export class EventMemberKillHistoryResponseDto extends createZodDto(
  EventMemberKillHistoryResponseSchema,
  {
    codec: true,
  },
) {}

export class KillDetailResponseDto extends createZodDto(
  KillDetailResponseSchema,
  {
    codec: true,
  },
) {}

export class EventHeroStatsResponseDto extends createZodDto(
  EventHeroStatsResponseSchema,
  {
    codec: true,
  },
) {}
