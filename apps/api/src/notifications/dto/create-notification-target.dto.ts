import { NotificationTargetType } from "@lootlog/schema/notifications";
import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateNotificationTargetSchema = z.object({
  targetType: z.nativeEnum(NotificationTargetType),
  externalId: z.string().max(100).optional(),
  displayName: z.string().max(255).optional(),
});

export class CreateNotificationTargetDto extends createSchemaClass(
  CreateNotificationTargetSchema,
) {}
