import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const MigrateTimerSettingsSchema = z.object({
  localData: z.record(z.string(), z.unknown()),
  conflictResolution: z.enum(["local", "remote", "merge"]).optional(),
});

export class MigrateTimerSettingsDto extends createSchemaClass(
  MigrateTimerSettingsSchema,
) {}
