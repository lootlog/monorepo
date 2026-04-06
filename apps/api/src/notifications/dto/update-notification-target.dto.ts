import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateNotificationTargetSchema = z.object({
  displayName: z.string().max(255).nullable().optional(),
  active: z.boolean().optional(),
});

export class UpdateNotificationTargetDto extends createZodDto(
  UpdateNotificationTargetSchema,
) {}
