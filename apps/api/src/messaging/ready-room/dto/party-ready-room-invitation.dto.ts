import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const PartyReadyRoomResolveInvitationTargetsSchema = z.object({
  participantIds: z.array(z.string().min(1).max(100)).min(1).max(100),
});

export class PartyReadyRoomResolveInvitationTargetsDto extends createSchemaClass(
  PartyReadyRoomResolveInvitationTargetsSchema,
) {}
