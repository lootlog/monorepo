import * as z from "zod";
import { CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor } from "@lootlog/client/main";
import { CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType } from "@lootlog/client/main";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import {
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "./notification-schedule-time.utils";
import { parseManualNotificationRuleNpcIds } from "./notification-rule-form-npc.utils";

export const ALL_WORLDS_VALUE = "__all_worlds__";

const createRuleFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
) =>
  z.object({
    name: z.string(),
    triggerType: z.nativeEnum(NotificationTriggerType),
    world: z.string().optional(),
    npcIds: z.array(z.string()).optional(),
    manualNpcEntry: z.boolean().optional(),
    manualNpcIds: z.string().optional(),
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
  });

type RuleFormData = z.infer<ReturnType<typeof createRuleFormSchema>>;
type Translator = (key: string, options?: Record<string, unknown>) => string;

const addIssue = (
  ctx: z.RefinementCtx,
  message: string,
  path: keyof RuleFormData,
) => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
};

const validateManualNpcIds = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
  maxNpcCount: number,
) => {
  const input = data.manualNpcIds ?? "";
  const parsedIds = parseManualNotificationRuleNpcIds(input);

  if (input.trim().length === 0) {
    addIssue(
      ctx,
      t("settings.notifications.validation.manualNpcIdsRequired"),
      "manualNpcIds",
    );
  } else if (parsedIds.invalidTokens.length > 0) {
    addIssue(
      ctx,
      t("settings.notifications.validation.manualNpcIdsInvalid"),
      "manualNpcIds",
    );
  }

  if (parsedIds.ids.length > maxNpcCount) {
    addIssue(
      ctx,
      t("settings.notifications.validation.maxNpcCount", {
        count: maxNpcCount,
      }),
      "manualNpcIds",
    );
  }
};

const validateSelectedNpcIds = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
  maxNpcCount: number,
) => {
  if (!data.npcIds || data.npcIds.length === 0) {
    addIssue(ctx, t("settings.notifications.validation.npcRequired"), "npcIds");
  }

  if (data.npcIds && data.npcIds.length > maxNpcCount) {
    addIssue(
      ctx,
      t("settings.notifications.validation.maxNpcCount", {
        count: maxNpcCount,
      }),
      "npcIds",
    );
  }
};

const validateTimerSchedule = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
) => {
  if (!data.scheduleAnchor) {
    addIssue(
      ctx,
      t("settings.notifications.validation.scheduleOffsetRequired"),
      "scheduleAnchor",
    );
  }

  const offset = data.scheduleOffsetMinutes?.trim();
  if (!offset || offset.length === 0) {
    addIssue(
      ctx,
      t("settings.notifications.validation.scheduleOffsetRequired"),
      "scheduleOffsetMinutes",
    );
  } else if (!Number.isInteger(Number(offset)) || Number(offset) < 0) {
    addIssue(
      ctx,
      t("settings.notifications.validation.scheduleOffsetNonNegative"),
      "scheduleOffsetMinutes",
    );
  }
};

const validateTimerRule = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
  maxNpcCount: number,
) => {
  if (!data.world || data.world === ALL_WORLDS_VALUE) {
    addIssue(
      ctx,
      t("settings.notifications.validation.worldRequired"),
      "world",
    );
  }

  if (data.manualNpcEntry ?? false) {
    validateManualNpcIds(data, ctx, t, maxNpcCount);
  } else {
    validateSelectedNpcIds(data, ctx, t, maxNpcCount);
  }

  validateTimerSchedule(data, ctx, t);
};

const validateScheduledAt = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
) => {
  if (!data.scheduledAt) {
    addIssue(
      ctx,
      t("settings.notifications.validation.scheduledAtRequired"),
      "scheduledAt",
    );
    return;
  }

  const scheduledAt = parseDateTimeLocalInputToIsoString(
    data.scheduledAt,
    GUILD_NOTIFICATION_TIMEZONE,
  );
  if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
    addIssue(
      ctx,
      t("settings.notifications.validation.scheduledAtFuture"),
      "scheduledAt",
    );
  }
};

const validateHourlyInterval = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
) => {
  const intervalValue = Number(data.scheduleIntervalValue);
  if (
    !data.scheduleIntervalValue ||
    !Number.isInteger(intervalValue) ||
    intervalValue < 1 ||
    intervalValue > 24
  ) {
    addIssue(
      ctx,
      t("settings.notifications.validation.intervalValueRange"),
      "scheduleIntervalValue",
    );
  }
};

const validateScheduledRule = (
  data: RuleFormData,
  ctx: z.RefinementCtx,
  t: Translator,
) => {
  const interval =
    data.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE;

  if (
    interval === NotificationScheduleIntervalType.ONCE ||
    interval === NotificationScheduleIntervalType.HOURLY
  ) {
    validateScheduledAt(data, ctx, t);
  }
  if (interval === NotificationScheduleIntervalType.HOURLY) {
    validateHourlyInterval(data, ctx, t);
  }
  if (
    (interval === NotificationScheduleIntervalType.DAILY ||
      interval === NotificationScheduleIntervalType.WEEKLY) &&
    (!data.scheduleTimeOfDay || !/^\d{2}:\d{2}$/.test(data.scheduleTimeOfDay))
  ) {
    addIssue(
      ctx,
      t("settings.notifications.validation.timeOfDayRequired"),
      "scheduleTimeOfDay",
    );
  }
  if (
    interval === NotificationScheduleIntervalType.WEEKLY &&
    (data.scheduleWeekday === undefined || data.scheduleWeekday === "")
  ) {
    addIssue(
      ctx,
      t("settings.notifications.validation.weekdayRequired"),
      "scheduleWeekday",
    );
  }
};

export const ruleFormSchema = (t: Translator, maxNpcCount: number) =>
  createRuleFormSchema(t).superRefine((data, ctx) => {
    if (data.triggerType === NotificationTriggerType.TIMER_BEFORE_SPAWN) {
      validateTimerRule(data, ctx, t, maxNpcCount);
    }
    if (data.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE) {
      validateScheduledRule(data, ctx, t);
    }
  });

export type RuleFormValues = z.infer<ReturnType<typeof ruleFormSchema>>;
