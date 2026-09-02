import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateGuildTimerSettingsSchema = z.object({
  hiddenTimers: z.array(z.string()).optional(),
  pinnedTimers: z.array(z.string()).optional(),
});

export class UpdateGuildTimerSettingsDto extends createZodDto(
  UpdateGuildTimerSettingsSchema,
) {}
