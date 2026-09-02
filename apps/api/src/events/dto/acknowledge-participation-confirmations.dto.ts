import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const AcknowledgeExpiredParticipationConfirmationsSchema = z.object({
  killIds: z.array(z.string()).min(1),
});

export class AcknowledgeExpiredParticipationConfirmationsDto extends createSchemaClass(
  AcknowledgeExpiredParticipationConfirmationsSchema,
) {}

const AcknowledgeExpiredParticipationConfirmationsResponseSchema = z.object({
  acknowledgedCount: z.number().int().nonnegative(),
});

export class AcknowledgeExpiredParticipationConfirmationsResponseDto extends createSchemaClass(
  AcknowledgeExpiredParticipationConfirmationsResponseSchema,
) {}
