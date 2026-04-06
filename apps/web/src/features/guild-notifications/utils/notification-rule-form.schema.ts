import * as z from "zod";
import {
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationTriggerType,
} from "@lootlog/types";
import {
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "./notification-schedule-time.utils";

export const ALL_WORLDS_VALUE = "__all_worlds__";

export const ruleFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  maxNpcCount: number,
) =>
  z
    .object({
      name: z.string(),
      triggerType: z.nativeEnum(NotificationTriggerType),
      world: z.string().optional(),
      npcNames: z.array(z.string()).optional(),
      contentTemplate: z
        .string()
        .trim()
        .min(1, t("settings.notifications.validation.templateRequired")),
      scheduleAnchor: z.nativeEnum(NotificationScheduleAnchor).optional(),
      scheduleOffsetMinutes: z.string().optional(),
      scheduledAt: z.string().optional(),
      scheduleIntervalType: z
        .nativeEnum(NotificationScheduleIntervalType)
        .optional(),
      scheduleIntervalValue: z.string().optional(),
      scheduleTimeOfDay: z.string().optional(),
      scheduleWeekday: z.string().optional(),
      scheduledUntil: z.string().optional(),
      targetIds: z
        .array(z.string())
        .min(1, t("settings.notifications.validation.targetRequired")),
      enabled: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.triggerType === NotificationTriggerType.TIMER_BEFORE_SPAWN) {
        if (!data.world || data.world === ALL_WORLDS_VALUE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.worldRequired"),
            path: ["world"],
          });
        }
        if (!data.npcNames || data.npcNames.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.npcRequired"),
            path: ["npcNames"],
          });
        }
        if (data.npcNames && data.npcNames.length > maxNpcCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.maxNpcCount", {
              count: maxNpcCount,
            }),
            path: ["npcNames"],
          });
        }
        if (!data.scheduleAnchor) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetRequired",
            ),
            path: ["scheduleAnchor"],
          });
        }
        const offset = data.scheduleOffsetMinutes?.trim();
        if (!offset || offset.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetRequired",
            ),
            path: ["scheduleOffsetMinutes"],
          });
        } else if (!Number.isInteger(Number(offset)) || Number(offset) < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetNonNegative",
            ),
            path: ["scheduleOffsetMinutes"],
          });
        }
      }

      if (data.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE) {
        const interval =
          data.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE;

        if (
          interval === NotificationScheduleIntervalType.ONCE ||
          interval === NotificationScheduleIntervalType.HOURLY
        ) {
          if (!data.scheduledAt) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t(
                "settings.notifications.validation.scheduledAtRequired",
              ),
              path: ["scheduledAt"],
            });
          } else {
            const scheduledAtIsoString = parseDateTimeLocalInputToIsoString(
              data.scheduledAt,
              GUILD_NOTIFICATION_TIMEZONE,
            );

            if (
              !scheduledAtIsoString ||
              new Date(scheduledAtIsoString).getTime() <= Date.now()
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t(
                  "settings.notifications.validation.scheduledAtFuture",
                ),
                path: ["scheduledAt"],
              });
            }
          }
        }

        if (interval === NotificationScheduleIntervalType.HOURLY) {
          const val = Number(data.scheduleIntervalValue);
          if (
            !data.scheduleIntervalValue ||
            !Number.isInteger(val) ||
            val < 1 ||
            val > 24
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t(
                "settings.notifications.validation.intervalValueRange",
              ),
              path: ["scheduleIntervalValue"],
            });
          }
        }

        if (
          interval === NotificationScheduleIntervalType.DAILY ||
          interval === NotificationScheduleIntervalType.WEEKLY
        ) {
          if (
            !data.scheduleTimeOfDay ||
            !/^\d{2}:\d{2}$/.test(data.scheduleTimeOfDay)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("settings.notifications.validation.timeOfDayRequired"),
              path: ["scheduleTimeOfDay"],
            });
          }
        }

        if (interval === NotificationScheduleIntervalType.WEEKLY) {
          if (
            data.scheduleWeekday === undefined ||
            data.scheduleWeekday === ""
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("settings.notifications.validation.weekdayRequired"),
              path: ["scheduleWeekday"],
            });
          }
        }
      }
    });

export type RuleFormValues = z.infer<ReturnType<typeof ruleFormSchema>>;
