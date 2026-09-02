import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import { CharacterSchema } from "#src/messaging/dto/shared-character.dto";

const ParticipantSchema = z.object({
  participantId: z.string(),
  discordId: z.string(),
  character: CharacterSchema,
  partyPresence: z.enum(["OUTSIDE", "IN_PARTY"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectionBaseSchema = z.object({
  schemaVersion: z.literal(3),
  notificationId: z.string(),
  organizerDiscordId: z.string(),
  organizerCharacter: CharacterSchema,
  guildIds: z.array(z.string()),
  world: z.string(),
  description: z.string().optional(),
  minLvl: z.number().optional(),
  maxLvl: z.number().optional(),
  status: z.literal("ACTIVE"),
  revision: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const PartyReadyRoomOrganizerProjectionSchema =
  ProjectionBaseSchema.extend({
    viewer: z.literal("ORGANIZER"),
    participants: z.record(z.string(), ParticipantSchema),
    ownedParticipantIds: z.array(z.string()),
  });

export const PartyReadyRoomProjectionSchema = z.discriminatedUnion("viewer", [
  PartyReadyRoomOrganizerProjectionSchema,
  ProjectionBaseSchema.extend({
    viewer: z.literal("PARTICIPANT"),
    participants: z.record(z.string(), ParticipantSchema),
  }),
]);

const PartyReadyRoomProjectionResponseSchema = ProjectionBaseSchema.extend({
  viewer: z.enum(["ORGANIZER", "PARTICIPANT"]),
  participants: z.record(z.string(), ParticipantSchema),
  ownedParticipantIds: z.array(z.string()).optional(),
});

export class PartyReadyRoomProjectionDto extends createZodDto(
  PartyReadyRoomProjectionResponseSchema,
) {}

export class PartyReadyRoomInvitationTargetsDto extends createZodDto(
  z.object({
    targets: z.array(
      z.object({
        participantId: z.string(),
        characterId: z.string(),
      }),
    ),
  }),
) {}

const PartyReadyRoomClientUpdateResponseSchema = z
  .object({
    schemaVersion: z.literal(3),
    type: z.enum(["UPSERT", "REMOVE"]),
    projection: PartyReadyRoomProjectionResponseSchema.optional(),
    notificationId: z.string().optional(),
    revision: z.number().int().min(1).optional(),
  })
  .superRefine((update, context) => {
    if (update.type === "UPSERT" && !update.projection) {
      context.addIssue({
        code: "custom",
        path: ["projection"],
        message: "UPSERT requires a projection",
      });
    }
    if (
      update.type === "REMOVE" &&
      (!update.notificationId || update.revision === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "REMOVE requires notificationId and revision",
      });
    }
  });

export class PartyReadyRoomClientUpdateDto extends createZodDto(
  PartyReadyRoomClientUpdateResponseSchema,
) {}
