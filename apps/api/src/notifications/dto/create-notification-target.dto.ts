import { NotificationTargetType } from "@lootlog/types";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateNotificationTargetSchema = z.object({
  targetType: z.nativeEnum(NotificationTargetType),
  externalId: z.string().max(100).optional(),
  displayName: z.string().max(255).optional(),
});

export class CreateNotificationTargetDto extends createZodDto(
  CreateNotificationTargetSchema,
) {}
