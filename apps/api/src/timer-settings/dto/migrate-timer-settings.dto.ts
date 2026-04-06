import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const MigrateTimerSettingsSchema = z.object({
  localData: z.record(z.string(), z.unknown()),
  conflictResolution: z.enum(["local", "remote", "merge"]).optional(),
});

export class MigrateTimerSettingsDto extends createZodDto(
  MigrateTimerSettingsSchema,
) {}
