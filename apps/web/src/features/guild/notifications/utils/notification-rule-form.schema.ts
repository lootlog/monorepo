import type { TOptions } from "i18next";
import { Schema } from "effect";
import {
  CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor,
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
} from "@lootlog/client/main";

import {
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "./notification-schedule-time.utils";
import { parseManualNotificationRuleNpcIds } from "./notification-rule-form-npc.utils";

export const ALL_WORLDS_VALUE = "__all_worlds__";

const LevelFilter = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 500 }),
);

const RuleFormFields = Schema.Struct({
  name: Schema.String,
  triggerType: Schema.Enum(NotificationTriggerType),
  world: Schema.optional(Schema.String),
  npcIds: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  manualNpcEntry: Schema.optional(Schema.Boolean),
  manualNpcIds: Schema.optional(Schema.String),
  contentTemplate: Schema.Trim,
  scheduleAnchor: Schema.optional(Schema.Enum(NotificationScheduleAnchor)),
  scheduleOffsetMinutes: Schema.optional(Schema.String),
  scheduledAt: Schema.optional(Schema.String),
  scheduleIntervalType: Schema.optional(
    Schema.Enum(NotificationScheduleIntervalType),
  ),
  scheduleIntervalValue: Schema.optional(Schema.String),
  scheduleTimeOfDay: Schema.optional(Schema.String),
  scheduleWeekday: Schema.optional(Schema.String),
  scheduledUntil: Schema.optional(Schema.String),
  npcLevelMin: Schema.optional(LevelFilter),
  npcLevelMax: Schema.optional(LevelFilter),
  targetIds: Schema.mutable(Schema.Array(Schema.String)),
  enabled: Schema.Boolean,
});

type RuleFormData = typeof RuleFormFields.Type;

type RuleFormIssues = Array<Schema.FilterIssue>;

type Translator = (key: string, options?: TOptions) => string;

const addIssue = (
  issues: RuleFormIssues,
  message: string,
  path: keyof RuleFormData,
) => {
  issues.push({ path: [path], issue: message });
};

const validateManualNpcIds = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
  maxNpcCount: number,
) => {
  const input = data.manualNpcIds ?? "";
  const parsedIds = parseManualNotificationRuleNpcIds(input);

  if (input.trim().length === 0) {
    addIssue(
      issues,
      t("settings.notifications.validation.manualNpcIdsRequired"),
      "manualNpcIds",
    );
  } else if (parsedIds.invalidTokens.length > 0) {
    addIssue(
      issues,
      t("settings.notifications.validation.manualNpcIdsInvalid"),
      "manualNpcIds",
    );
  }

  if (parsedIds.ids.length > maxNpcCount) {
    addIssue(
      issues,
      t("settings.notifications.validation.maxNpcCount", {
        count: maxNpcCount,
      }),
      "manualNpcIds",
    );
  }
};

const validateSelectedNpcIds = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
  maxNpcCount: number,
) => {
  if (!data.npcIds || data.npcIds.length === 0) {
    addIssue(
      issues,
      t("settings.notifications.validation.npcRequired"),
      "npcIds",
    );
  }

  if (data.npcIds && data.npcIds.length > maxNpcCount) {
    addIssue(
      issues,
      t("settings.notifications.validation.maxNpcCount", {
        count: maxNpcCount,
      }),
      "npcIds",
    );
  }
};

const validateTimerSchedule = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
) => {
  if (!data.scheduleAnchor) {
    addIssue(
      issues,
      t("settings.notifications.validation.scheduleOffsetRequired"),
      "scheduleAnchor",
    );
  }

  const offset = data.scheduleOffsetMinutes?.trim();

  if (!offset || offset.length === 0) {
    addIssue(
      issues,
      t("settings.notifications.validation.scheduleOffsetRequired"),
      "scheduleOffsetMinutes",
    );
  } else if (!Number.isInteger(Number(offset)) || Number(offset) < 0) {
    addIssue(
      issues,
      t("settings.notifications.validation.scheduleOffsetNonNegative"),
      "scheduleOffsetMinutes",
    );
  }
};

const validateTimerRule = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
  maxNpcCount: number,
) => {
  if (data.manualNpcEntry ?? false) {
    validateManualNpcIds(data, issues, t, maxNpcCount);
  } else {
    validateSelectedNpcIds(data, issues, t, maxNpcCount);
  }

  validateTimerSchedule(data, issues, t);
};

const validateScheduledAt = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
) => {
  if (!data.scheduledAt) {
    addIssue(
      issues,
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
      issues,
      t("settings.notifications.validation.scheduledAtFuture"),
      "scheduledAt",
    );
  }
};

const validateHourlyInterval = (
  data: RuleFormData,
  issues: RuleFormIssues,
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
      issues,
      t("settings.notifications.validation.intervalValueRange"),
      "scheduleIntervalValue",
    );
  }
};

const validateScheduledRule = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
) => {
  const interval =
    data.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE;

  if (
    interval === NotificationScheduleIntervalType.ONCE ||
    interval === NotificationScheduleIntervalType.HOURLY
  ) {
    validateScheduledAt(data, issues, t);
  }

  if (interval === NotificationScheduleIntervalType.HOURLY) {
    validateHourlyInterval(data, issues, t);
  }

  if (
    (interval === NotificationScheduleIntervalType.DAILY ||
      interval === NotificationScheduleIntervalType.WEEKLY) &&
    (!data.scheduleTimeOfDay || !/^\d{2}:\d{2}$/.test(data.scheduleTimeOfDay))
  ) {
    addIssue(
      issues,
      t("settings.notifications.validation.timeOfDayRequired"),
      "scheduleTimeOfDay",
    );
  }

  if (
    interval === NotificationScheduleIntervalType.WEEKLY &&
    (data.scheduleWeekday === undefined || data.scheduleWeekday === "")
  ) {
    addIssue(
      issues,
      t("settings.notifications.validation.weekdayRequired"),
      "scheduleWeekday",
    );
  }
};

const validateHeroSightingRule = (
  data: RuleFormData,
  issues: RuleFormIssues,
  t: Translator,
) => {
  // A detector answer belongs to one world, so a hero rule watches one.
  if (!data.world || data.world === ALL_WORLDS_VALUE) {
    addIssue(
      issues,
      t("settings.notifications.validation.worldRequired"),
      "world",
    );
  }

  if (
    data.npcLevelMin !== undefined &&
    data.npcLevelMax !== undefined &&
    data.npcLevelMin > data.npcLevelMax
  ) {
    addIssue(
      issues,
      t("settings.notifications.validation.npcLevelOrder"),
      "npcLevelMax",
    );
  }
};

export const ruleFormSchema = (t: Translator, maxNpcCount: number) =>
  Schema.toStandardSchemaV1(
    RuleFormFields.check(
      // One filter keeps the field rules and the trigger rules reporting
      // together, so a submit shows every problem at once.
      Schema.makeFilter((data) => {
        const issues: RuleFormIssues = [];

        if (data.contentTemplate.length === 0) {
          addIssue(
            issues,
            t("settings.notifications.validation.templateRequired"),
            "contentTemplate",
          );
        }

        if (data.targetIds.length === 0) {
          addIssue(
            issues,
            t("settings.notifications.validation.targetRequired"),
            "targetIds",
          );
        }

        if (data.triggerType === NotificationTriggerType.TIMER_BEFORE_SPAWN) {
          validateTimerRule(data, issues, t, maxNpcCount);
        }

        if (data.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE) {
          validateScheduledRule(data, issues, t);
        }

        if (data.triggerType === NotificationTriggerType.HERO_SIGHTED) {
          validateHeroSightingRule(data, issues, t);
        }

        return issues;
      }),
    ),
  );

export type RuleFormValues = RuleFormData;
