import {
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTriggerType,
} from "@lootlog/schema/notifications";
import * as z from "zod";
import { createZodDto } from "nestjs-zod";
import { Error } from "#src/notifications/enum/error.enum";

const CreateNotificationRuleSchema = z
  .object({
    name: z.string().max(255).nullable().optional(),
    contentTemplate: z.string().max(4000).nullable().optional(),
    triggerType: z.nativeEnum(NotificationTriggerType),
    world: z.string().max(50).optional(),
    npcId: z.number().int().optional(),
    npcIds: z.array(z.number().int()).max(5).optional(),
    itemId: z.number().int().optional(),
    itemIds: z.array(z.number().int()).max(20).optional(),
    scheduleStrategy: z.nativeEnum(NotificationScheduleStrategy).optional(),
    scheduleAnchor: z.nativeEnum(NotificationScheduleAnchor).optional(),
    scheduleOffsetMinutes: z.number().int().min(0).max(1440).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    scheduleIntervalType: z
      .nativeEnum(NotificationScheduleIntervalType)
      .optional(),
    scheduleIntervalValue: z.number().int().min(1).max(24).optional(),
    scheduleWeekday: z.number().int().min(0).max(6).optional(),
    scheduleTimeOfDay: z
      .string()
      .regex(/^\d{2}:\d{2}$/, { message: Error.TIME_MUST_BE_HH_MM_FORMAT })
      .optional(),
    scheduledUntil: z.string().datetime({ offset: true }).optional(),
    scheduleTimezone: z.string().max(50).optional(),
    targetIds: z.array(z.number().int()).max(3),
    enabled: z.boolean().optional(),
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
  .superRefine((data, ctx) => {
    const hasNpcId = typeof data.npcId === "number";
    const hasNpcIds = Array.isArray(data.npcIds) && data.npcIds.length > 0;

    if (data.npcId !== undefined || data.npcIds !== undefined) {
      if (!hasNpcId && !hasNpcIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: Error.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
          path: ["npcId"],
        });
      }
    }
  });

export class CreateNotificationRuleDto extends createZodDto(
  CreateNotificationRuleSchema,
) {}
