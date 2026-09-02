import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const ExpectedRevisionSchema = z.object({
  expectedRevision: z.number().int().min(1),
});

const PartyReadyRoomParticipantActionSchema = ExpectedRevisionSchema.extend({
  participantId: z.string().min(1).max(100),
});

const PartyReadyRoomParticipantIdentitySchema = z.object({
  participantId: z.string().min(1).max(100),
});

export class PartyReadyRoomExpectedRevisionDto extends createSchemaClass(
  ExpectedRevisionSchema,
) {}

export class PartyReadyRoomParticipantActionDto extends createSchemaClass(
  PartyReadyRoomParticipantActionSchema,
) {}

export class PartyReadyRoomParticipantIdentityDto extends createSchemaClass(
  PartyReadyRoomParticipantIdentitySchema,
) {}
