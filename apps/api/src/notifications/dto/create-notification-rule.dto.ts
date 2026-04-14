import { NotificationTriggerType } from "@lootlog/types";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { Error } from "src/notifications/enum/error.enum";
import {
  notificationRuleFields,
  npcIdSuperRefine,
} from "src/notifications/dto/notification-rule-fields";

const CreateNotificationRuleSchema = z
  .object({
    ...notificationRuleFields,
    triggerType: z.nativeEnum(NotificationTriggerType),
    targetIds: z.array(z.number().int()).max(3),
  })
  .superRefine((data, ctx) => {
    if (
      data.triggerType !== NotificationTriggerType.SCHEDULED_MESSAGE &&
      (!data.world || data.world.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: Error.NOTIFICATION_RULE_WORLD_REQUIRED,
        path: ["world"],
      });
    }
  })
  .superRefine(npcIdSuperRefine);

export class CreateNotificationRuleDto extends createZodDto(
  CreateNotificationRuleSchema,
) {}
