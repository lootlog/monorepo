import { NotificationTriggerType } from "@lootlog/types";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { Error } from "src/notifications/enum/error.enum";
import {
  notificationRuleFields,
  npcIdSuperRefine,
} from "src/notifications/dto/notification-rule-fields";

const UpdateNotificationRuleSchema = z
  .object({
    ...notificationRuleFields,
    triggerType: z.nativeEnum(NotificationTriggerType).optional(),
    targetIds: z.array(z.number().int()).max(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.world !== undefined &&
      (!data.world || data.world.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: Error.NOTIFICATION_RULE_WORLD_REQUIRED,
        path: ["world"],
      });
    }
  })
  .superRefine(npcIdSuperRefine);

export class UpdateNotificationRuleDto extends createZodDto(
  UpdateNotificationRuleSchema,
) {}
