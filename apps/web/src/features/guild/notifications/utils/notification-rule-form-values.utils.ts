import { MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import {
  CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor,
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  type CreateNotificationRuleDtoTriggerType,
  type NotificationRuleResponseDto,
} from "@lootlog/client/main";
import { getNotificationFieldVisibility } from "./notification-field-visibility";
import {
  getDefaultGuildNotificationRuleContentTemplate,
  getDefaultScheduledMessageContentTemplate,
  getDefaultHeroSightingContentTemplate,
  getDefaultLootDrawContentTemplate,
  getGuildNotificationRuleNpcIds,
  getGuildNotificationRuleTargetIds,
} from "./notification-settings.utils";
import {
  formatDateTimeLocalInputValue,
  parseDateTimeLocalInputToIsoString,
} from "./notification-schedule-time.utils";
import {
  ALL_WORLDS_VALUE,
  type RuleFormValues,
} from "./notification-rule-form.schema";

export const getDefaultContentTemplate = (
  triggerType: CreateNotificationRuleDtoTriggerType,
) => {
  switch (triggerType) {
    case NotificationTriggerType.SCHEDULED_MESSAGE:
      return getDefaultScheduledMessageContentTemplate();
    case NotificationTriggerType.HERO_SIGHTED:
      return getDefaultHeroSightingContentTemplate();
    case NotificationTriggerType.LOOT_DRAW_RESOLVED:
      return getDefaultLootDrawContentTemplate();
    default:
      return getDefaultGuildNotificationRuleContentTemplate();
  }
};

export const getEmptyRuleFormValues = (): RuleFormValues => ({
  name: "",
  triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
  world: ALL_WORLDS_VALUE,
  npcIds: [],
  manualNpcEntry: false,
  manualNpcIds: "",
  contentTemplate: getDefaultGuildNotificationRuleContentTemplate(),
  scheduleAnchor: NotificationScheduleAnchor.MIN_SPAWN,
  scheduleOffsetMinutes: "0",
  scheduledAt: "",
  scheduleIntervalType: NotificationScheduleIntervalType.ONCE,
  scheduleIntervalValue: "",
  scheduleTimeOfDay: "",
  scheduleWeekday: "",
  scheduledUntil: "",
  targetIds: [],
  enabled: true,
});

const getScheduledUntilPayload = (
  values: RuleFormValues,
  isRecurring: boolean,
  savedScheduledUntil: string | null | undefined,
) => {
  if (!isRecurring) return undefined;

  const scheduledUntil = parseDateTimeLocalInputToIsoString(
    values.scheduledUntil,
    MARGONEM_TIME_ZONE,
  );

  if (scheduledUntil) return scheduledUntil;

  return savedScheduledUntil ? null : undefined;
};

export const getScheduledMessagePayload = (
  values: RuleFormValues,
  savedScheduledUntil: string | null | undefined,
) => {
  const visibleFields = getNotificationFieldVisibility(
    values.triggerType,
    values.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
  );

  return {
    scheduledAt: visibleFields.showScheduledAtField
      ? parseDateTimeLocalInputToIsoString(
          values.scheduledAt,
          MARGONEM_TIME_ZONE,
        )
      : undefined,
    scheduleIntervalType:
      values.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
    scheduleIntervalValue:
      visibleFields.showIntervalValueField && values.scheduleIntervalValue
        ? Number(values.scheduleIntervalValue)
        : undefined,
    scheduleTimeOfDay: visibleFields.showTimeOfDayField
      ? values.scheduleTimeOfDay || undefined
      : undefined,
    scheduleWeekday:
      visibleFields.showWeekdayField && values.scheduleWeekday !== ""
        ? Number(values.scheduleWeekday)
        : undefined,
    scheduledUntil: getScheduledUntilPayload(
      values,
      visibleFields.isRecurring,
      savedScheduledUntil,
    ),
    scheduleTimezone: MARGONEM_TIME_ZONE,
  };
};

const stringifyNullable = (value: number | null | undefined, fallback = "") =>
  value === null || value === undefined ? fallback : String(value);

const formatRuleDate = (value: string | null, timezone: string | null) =>
  value
    ? formatDateTimeLocalInputValue(value, timezone ?? MARGONEM_TIME_ZONE)
    : "";

export const getRuleFormDefaultValues = (
  rule: NotificationRuleResponseDto | undefined,
): RuleFormValues => {
  if (!rule) {
    return getEmptyRuleFormValues();
  }

  const triggerType =
    rule.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN;

  const npcIds = getGuildNotificationRuleNpcIds(rule);

  return {
    name: rule.name ?? "",
    triggerType,
    world: rule.world ?? ALL_WORLDS_VALUE,
    npcIds,
    manualNpcEntry: false,
    manualNpcIds: npcIds.join("\n"),
    contentTemplate:
      rule.contentTemplate ?? getDefaultContentTemplate(triggerType),
    scheduleAnchor: rule.scheduleAnchor ?? NotificationScheduleAnchor.MIN_SPAWN,
    scheduleOffsetMinutes: stringifyNullable(rule.scheduleOffsetMinutes, "0"),
    scheduledAt: formatRuleDate(rule.scheduledAt, rule.scheduleTimezone),
    scheduleIntervalType:
      rule.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
    scheduleIntervalValue: stringifyNullable(rule.scheduleIntervalValue),
    scheduleTimeOfDay: rule.scheduleTimeOfDay ?? "",
    scheduleWeekday: stringifyNullable(rule.scheduleWeekday),
    scheduledUntil: formatRuleDate(rule.scheduledUntil, rule.scheduleTimezone),
    npcLevelMin: rule.filters?.npcLevelMin,
    npcLevelMax: rule.filters?.npcLevelMax,
    targetIds: getGuildNotificationRuleTargetIds(rule),
    enabled: rule.enabled ?? true,
  };
};
