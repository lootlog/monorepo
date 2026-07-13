import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { CharacterSchema } from "src/messaging/dto/shared-character.dto";

const InvitationSchema = z.object({
  status: z.enum(["NOT_MARKED", "COMMAND_RESERVED", "SENT", "FAILED"]),
  source: z.enum(["LOOTLOG_COMMAND", "MANUAL_ANNOTATION"]).nullable(),
  commandId: z.string().nullable(),
  batchId: z.string().nullable(),
  reservationExpiresAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

const ParticipantSchema = z.object({
  discordId: z.string(),
  character: CharacterSchema,
  application: z.enum(["APPLIED", "ACCEPTED", "DECLINED", "WITHDRAWN"]),
  readiness: z.enum(["NOT_REQUESTED", "PENDING", "READY", "NOT_READY"]),
  invitation: InvitationSchema,
  partyPresence: z.enum(["OUTSIDE", "IN_PARTY"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectionBaseSchema = z.object({
  notificationId: z.string(),
  organizerDiscordId: z.string(),
  organizerCharacter: CharacterSchema,
  guildIds: z.array(z.string()),
  world: z.string(),
  description: z.string().optional(),
  minLvl: z.number().optional(),
  maxLvl: z.number().optional(),
  status: z.enum(["ACTIVE", "CLOSED", "CANCELLED"]),
  revision: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  readyCheck: z
    .object({
      roundId: z.number().int().min(1),
      startedAt: z.string().datetime(),
    })
    .nullable(),
});

export const PartyReadyRoomOrganizerProjectionSchema =
  ProjectionBaseSchema.extend({
    viewer: z.literal("ORGANIZER"),
    participants: z.record(z.string(), ParticipantSchema),
  });

export const PartyReadyRoomProjectionSchema = z.discriminatedUnion("viewer", [
  PartyReadyRoomOrganizerProjectionSchema,
  ProjectionBaseSchema.extend({
    viewer: z.literal("PARTICIPANT"),
    participant: ParticipantSchema,
  }),
]);

const PartyReadyRoomProjectionResponseSchema = ProjectionBaseSchema.extend({
  viewer: z.enum(["ORGANIZER", "PARTICIPANT"]),
  participants: z.record(z.string(), ParticipantSchema).optional(),
  participant: ParticipantSchema.optional(),
});

const InvitationBatchSchema = z.object({
  batchId: z.string(),
  reservations: z.array(
    z.object({
      participantDiscordId: z.string(),
      characterId: z.string(),
      commandId: z.string(),
    }),
  ),
});

export class PartyReadyRoomProjectionDto extends createZodDto(
  PartyReadyRoomProjectionResponseSchema,
) {}

export class PartyReadyRoomInvitationReservationDto extends createZodDto(
  z.object({
    projection: PartyReadyRoomOrganizerProjectionSchema,
    batch: InvitationBatchSchema,
  }),
) {}
