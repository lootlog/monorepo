import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateNotificationTargetSchema = z.object({
  displayName: z.string().max(255).nullable().optional(),
  active: z.boolean().optional(),
});

export class UpdateNotificationTargetDto extends createSchemaClass(
  UpdateNotificationTargetSchema,
) {}
