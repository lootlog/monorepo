import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";
import { z } from "zod";
import { EVENT_SCORING_MODES } from "@lootlog/scoring";

const PointsEditType = prismaDb.nativeEnums.public.PointsEditType.members;
type PointsEditType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["PointsEditType"]["values"][number];

const EventHeroNpcResponseSchema = z.object({
  id: z.string(),
  npcId: z.number().nullable(),
  npcName: z.string(),
  npcIcon: z.string().nullable(),
  npcLvl: z.number().nullable(),
});

const EventMemberRoleResponseSchema = z.object({
  position: z.number(),
  color: z.number().nullable(),
});

const EventAssignedMemberResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  userId: z.string(),
  roles: z.array(EventMemberRoleResponseSchema),
});

const EventMapResponseSchema = z.object({
  id: z.string(),
  mapId: z.number(),
  mapName: z.string(),
  locationId: z.string().nullable(),
  assignedMembers: z.array(EventAssignedMemberResponseSchema),
});

const EventLocationResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  maps: z.array(EventMapResponseSchema),
});

export const EventListItemResponseSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  world: z.string(),
  active: z.boolean(),
  startsAt: nullableIsoDatetimeCodec,
  endsAt: nullableIsoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  heroNpcs: z.array(EventHeroNpcResponseSchema),
});

const EventOverviewResponseSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  world: z.string(),
  active: z.boolean(),
  startsAt: nullableIsoDatetimeCodec,
  endsAt: nullableIsoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  basePointsPerKill: z.number().nullable().optional(),
  assignmentTimeoutMinutes: z.number().nullable().optional(),
  participationConfirmationMinutes: z.number().nullable().optional(),
  mapAssignmentCap: z.number().nullable().optional(),
  rulebookMarkdown: z.string().nullable().optional(),
  scoringMode: z.enum(EVENT_SCORING_MODES),
  scoringRules: jsonValueSchema.nullable(),
  heroNpcs: z.array(EventHeroNpcResponseSchema),
});

const EventMutationHeroResponseSchema = EventHeroNpcResponseSchema.extend({
  maps: z.array(EventMapResponseSchema),
});

const EventMapsHeroResponseSchema = EventHeroNpcResponseSchema.extend({
  locations: z.array(EventLocationResponseSchema),
  maps: z.array(EventMapResponseSchema),
});

const EventMutationResponseSchema = EventOverviewResponseSchema.extend({
  heroNpcs: z.array(EventMutationHeroResponseSchema),
});

const EventMapsResponseSchema = z.object({
  id: z.string(),
  heroNpcs: z.array(EventMapsHeroResponseSchema),
});

export class EventListItemResponseDto extends createZodDto(
  EventListItemResponseSchema,
  {
    codec: true,
  },
) {}

export class EventOverviewResponseDto extends createZodDto(
  EventOverviewResponseSchema,
  {
    codec: true,
  },
) {}

export class EventMapResponseDto extends createZodDto(EventMapResponseSchema) {}

export class EventMutationResponseDto extends createZodDto(
  EventMutationResponseSchema,
  {
    codec: true,
  },
) {}

export class EventMapsResponseDto extends createZodDto(
  EventMapsResponseSchema,
) {}

export class EventsListResponseDto extends createZodDto(
  z.array(EventListItemResponseSchema),
  {
    codec: true,
  },
) {}

const EventRankingMemberResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  roles: z.array(EventMemberRoleResponseSchema),
});

const RankingEditHistoryEntryResponseSchema = z.object({
  id: z.string(),
  rankingId: z.string(),
  previousPoints: z.number(),
  newPoints: z.number(),
  deltaPoints: z.number(),
  editType: z.nativeEnum(PointsEditType),
  editedByUserId: z.string(),
  editedByName: z.string().nullable(),
  comment: z.string().nullable(),
  editedAt: isoDatetimeCodec,
});

const EventRankingEntryResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  memberId: z.number(),
  heroNpcName: z.string(),
  totalPoints: z.number(),
  totalKills: z.number(),
  totalTimeSeconds: z.number(),
  avgAfkPercentage: z.number(),
  pointsModified: z.boolean(),
  updatedAt: isoDatetimeCodec,
  member: EventRankingMemberResponseSchema,
  editHistory: z.array(RankingEditHistoryEntryResponseSchema),
});

export class EventRankingEntryResponseDto extends createZodDto(
  EventRankingEntryResponseSchema,
  {
    codec: true,
  },
) {}

export class EventRankingResponseDto extends createZodDto(
  z.array(EventRankingEntryResponseSchema),
  {
    codec: true,
  },
) {}

const PendingParticipationConfirmationResponseSchema = z.object({
  killId: z.string(),
  killedAt: isoDatetimeCodec,
  confirmationDeadlineAt: isoDatetimeCodec,
  heroNpc: EventHeroNpcResponseSchema,
});

export class PendingParticipationConfirmationResponseDto extends createZodDto(
  PendingParticipationConfirmationResponseSchema,
  {
    codec: true,
  },
) {}

export class PendingParticipationConfirmationsResponseDto extends createZodDto(
  z.object({
    items: z.array(PendingParticipationConfirmationResponseSchema),
    expiredItems: z.array(PendingParticipationConfirmationResponseSchema),
  }),
  {
    codec: true,
  },
) {}

const EventTimerNpcResponseSchema = z.object({
  name: z.string(),
  icon: z.string().nullable(),
});

const EventTimerResponseSchema = z.object({
  npcId: z.number(),
  world: z.string(),
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  npc: EventTimerNpcResponseSchema,
});

export class EventTimerResponseDto extends createZodDto(
  EventTimerResponseSchema,
  {
    codec: true,
  },
) {}

export class EventTimersResponseDto extends createZodDto(
  z.array(EventTimerResponseSchema),
  {
    codec: true,
  },
) {}

export class ConfirmParticipationForKillResponseDto extends createZodDto(
  z.object({
    success: z.boolean(),
    confirmedNow: z.boolean(),
  }),
) {}

export class SuccessResponseDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}
