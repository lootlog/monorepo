import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateGuildTimerSettingsSchema = z.object({
  hiddenTimers: z.array(z.string()).optional(),
  pinnedTimers: z.array(z.string()).optional(),
});

export class UpdateGuildTimerSettingsDto extends createSchemaClass(
  UpdateGuildTimerSettingsSchema,
) {}
