import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateEventSettingsSchema = z.object({
  pinnedEvents: z.array(z.string()).optional(),
});

export class UpdateEventSettingsDto extends createZodDto(
  UpdateEventSettingsSchema,
) {}
