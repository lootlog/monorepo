import { createZodDto } from "nestjs-zod";
import * as z from "zod";

const AcknowledgeExpiredParticipationConfirmationsSchema = z.object({
  killIds: z.array(z.string()).min(1),
});

export class AcknowledgeExpiredParticipationConfirmationsDto extends createZodDto(
  AcknowledgeExpiredParticipationConfirmationsSchema,
) {}

const AcknowledgeExpiredParticipationConfirmationsResponseSchema = z.object({
  acknowledgedCount: z.number().int().nonnegative(),
});

export class AcknowledgeExpiredParticipationConfirmationsResponseDto extends createZodDto(
  AcknowledgeExpiredParticipationConfirmationsResponseSchema,
) {}
