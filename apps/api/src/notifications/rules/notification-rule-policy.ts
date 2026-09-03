import type {
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
} from "#src/http-api/contracts/notifications/schemas";
import { Error as NotificationError } from "#src/notifications/error";
import type {
  JsonObject,
  JsonValue,
} from "#src/notifications/notification-database.types";
import {
  NotificationOwnerType,
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTriggerType,
  type NotificationOwnerType as NotificationOwnerTypeValue,
  type NotificationScheduleAnchor as NotificationScheduleAnchorValue,
  type NotificationScheduleIntervalType as NotificationScheduleIntervalTypeValue,
  type NotificationScheduleStrategy as NotificationScheduleStrategyValue,
  type NotificationTriggerType as NotificationTriggerTypeValue,
} from "#src/notifications/notification-enums";
import { GUILD_NOTIFICATION_TIMEZONE } from "#src/notifications/rules/schedule-timezone";
import {
  calculateFirstOccurrenceInTimeZone,
  isRecurringScheduleInterval,
  isValidTimeZone,
} from "#src/notifications/rules/notification-schedule-time";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { hasOwnField } from "#src/shared/has-own-field";

const MAX_NPCS_PER_RULE = 5;

type RuleInput = CreateNotificationRuleDto | UpdateNotificationRuleDto;
type ExistingRule = {
  readonly triggerType: NotificationTriggerTypeValue;
  readonly world: string | null;
  readonly name: string | null;
  readonly filters: unknown;
  readonly contentTemplate: string | null;
  readonly scheduleStrategy: NotificationScheduleStrategyValue | null;
  readonly scheduleAnchor: NotificationScheduleAnchorValue | null;
  readonly scheduleOffsetMinutes: number | null;
  readonly scheduledAt: Date | null;
  readonly scheduleIntervalType: NotificationScheduleIntervalTypeValue | null;
  readonly scheduleIntervalValue: number | null;
  readonly scheduleWeekday: number | null;
  readonly scheduleTimeOfDay: string | null;
  readonly scheduledUntil: Date | null;
  readonly scheduleTimezone: string | null;
  readonly enabled: boolean;
  readonly dedupeWindowSeconds: number;
};

const firstNonNullish = <T>(
  fallback: T,
  ...values: Array<T | null | undefined>
): T =>
  values.find((value): value is T => value !== null && value !== undefined) ??
  fallback;

const isScheduledMessage = (triggerType: NotificationTriggerTypeValue) =>
  triggerType === NotificationTriggerType.SCHEDULED_MESSAGE;

const validateNpcSelection = (data: RuleInput) => {
  const npcIds = new Set<number>();
  if (typeof data.npcId === "number") npcIds.add(data.npcId);
  for (const npcId of data.npcIds ?? []) npcIds.add(npcId);
  if (npcIds.size > MAX_NPCS_PER_RULE) {
    throw new InvalidRequestError({
      message: NotificationError.NOTIFICATION_RULE_MAX_NPCS_EXCEEDED,
      maxNpcsPerRule: MAX_NPCS_PER_RULE,
    });
  }
};

const buildFilters = (data: RuleInput): JsonObject => {
  const filters: JsonObject = {};
  if (data.npcId !== undefined) filters.npcId = data.npcId;
  if (data.npcIds !== undefined) filters.npcIds = [...data.npcIds];
  if (data.itemId !== undefined) filters.itemId = data.itemId;
  if (data.itemIds !== undefined) filters.itemIds = [...data.itemIds];
  return filters;
};

const normalizeContentTemplate = (value?: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const scheduleConfig = (
  triggerType: NotificationTriggerTypeValue,
  data: RuleInput,
  existing?: ExistingRule,
) => {
  if (isScheduledMessage(triggerType)) {
    return {
      scheduleStrategy: NotificationScheduleStrategy.FIXED_DATETIME,
      scheduleAnchor: null,
      scheduleOffsetMinutes: null,
    };
  }
  if (triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN) {
    return {
      scheduleStrategy: null,
      scheduleAnchor: null,
      scheduleOffsetMinutes: null,
    };
  }
  const strategy =
    (data.scheduleStrategy as NotificationScheduleStrategyValue | undefined) ??
    existing?.scheduleStrategy ??
    null;
  const anchor =
    (data.scheduleAnchor as NotificationScheduleAnchorValue | undefined) ??
    existing?.scheduleAnchor ??
    null;
  const offset =
    data.scheduleOffsetMinutes ?? existing?.scheduleOffsetMinutes ?? null;
  if (strategy !== NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE) {
    throw new InvalidRequestError(
      NotificationError.TIMER_NOTIFICATION_REQUIRES_SPAWN_WINDOW_RELATIVE_STRATEGY,
    );
  }
  if (
    anchor !== NotificationScheduleAnchor.MIN_SPAWN &&
    anchor !== NotificationScheduleAnchor.MAX_SPAWN
  ) {
    throw new InvalidRequestError(
      NotificationError.TIMER_NOTIFICATION_REQUIRES_VALID_SCHEDULE_ANCHOR,
    );
  }
  if (offset === null || offset < 0) {
    throw new InvalidRequestError(
      NotificationError.TIMER_NOTIFICATION_REQUIRES_NON_NEGATIVE_SCHEDULE_OFFSET,
    );
  }
  return {
    scheduleStrategy: strategy,
    scheduleAnchor: anchor,
    scheduleOffsetMinutes: offset,
  };
};

const scheduleTimezone = (
  ownerType: NotificationOwnerTypeValue,
  provided?: string | null,
  existing?: string | null,
) => {
  const normalized = provided?.trim() ?? "";
  if (normalized.length > 0) {
    if (!isValidTimeZone(normalized)) {
      throw new InvalidRequestError(
        NotificationError.INVALID_NOTIFICATION_SCHEDULE_TIMEZONE,
      );
    }
    return normalized;
  }
  return (
    existing ??
    (ownerType === NotificationOwnerType.GUILD
      ? GUILD_NOTIFICATION_TIMEZONE
      : null)
  );
};

const scheduledUntil = (data: RuleInput, existing?: ExistingRule) => {
  if (!hasOwnField(data, "scheduledUntil")) {
    return existing?.scheduledUntil ?? null;
  }
  return data.scheduledUntil ? new Date(data.scheduledUntil) : null;
};

const firstScheduledOccurrence = (options: {
  readonly data: RuleInput;
  readonly existing?: ExistingRule;
  readonly intervalType: NotificationScheduleIntervalTypeValue;
  readonly timeOfDay: string | null;
  readonly weekday: number | null;
  readonly timezone: string | null;
}) => {
  const scheduledAt = options.data.scheduledAt
    ? new Date(options.data.scheduledAt)
    : (options.existing?.scheduledAt ?? null);
  if (
    scheduledAt ||
    !isRecurringScheduleInterval(options.intervalType) ||
    !options.timeOfDay ||
    !options.timezone
  ) {
    return scheduledAt;
  }
  return calculateFirstOccurrenceInTimeZone({
    intervalType: options.intervalType,
    timeOfDay: options.timeOfDay,
    weekday: options.weekday,
    timeZone: options.timezone,
  });
};

const scheduledMessageFields = (
  ownerType: NotificationOwnerTypeValue,
  data: RuleInput | null,
  existing?: ExistingRule,
) => {
  if (!data) {
    return {
      scheduledAt: null,
      scheduleIntervalType: null,
      scheduleIntervalValue: null,
      scheduleWeekday: null,
      scheduleTimeOfDay: null,
      scheduledUntil: null,
      scheduleTimezone: null,
    };
  }
  const intervalType = firstNonNullish(
    NotificationScheduleIntervalType.ONCE,
    data.scheduleIntervalType as
      | NotificationScheduleIntervalTypeValue
      | undefined,
    existing?.scheduleIntervalType,
  );
  const intervalValue = firstNonNullish<number | null>(
    null,
    data.scheduleIntervalValue,
    existing?.scheduleIntervalValue,
  );
  const weekday = firstNonNullish<number | null>(
    null,
    data.scheduleWeekday,
    existing?.scheduleWeekday,
  );
  const timeOfDay = firstNonNullish<string | null>(
    null,
    data.scheduleTimeOfDay,
    existing?.scheduleTimeOfDay,
  );
  const until = scheduledUntil(data, existing);
  const timezone = scheduleTimezone(
    ownerType,
    data.scheduleTimezone,
    existing?.scheduleTimezone,
  );
  if (
    ownerType === NotificationOwnerType.USER &&
    isRecurringScheduleInterval(intervalType) &&
    !timezone
  ) {
    throw new InvalidRequestError(
      NotificationError.RECURRING_USER_SCHEDULED_MESSAGES_REQUIRE_TIMEZONE,
    );
  }
  const scheduledAt = firstScheduledOccurrence({
    data,
    existing,
    intervalType,
    timeOfDay,
    weekday,
    timezone,
  });
  return {
    scheduledAt,
    scheduleIntervalType: intervalType,
    scheduleIntervalValue: intervalValue,
    scheduleWeekday: weekday,
    scheduleTimeOfDay: timeOfDay,
    scheduledUntil: until,
    scheduleTimezone: timezone,
  };
};

export const createNotificationRuleValues = (
  ownerType: NotificationOwnerTypeValue,
  ownerId: string,
  data: CreateNotificationRuleDto,
) => {
  const triggerType = data.triggerType as NotificationTriggerTypeValue;
  const scheduled = isScheduledMessage(triggerType);
  if (!scheduled) validateNpcSelection(data);
  return {
    ownerType,
    ownerId,
    triggerType,
    guildId: ownerType === NotificationOwnerType.GUILD ? ownerId : null,
    world: scheduled ? null : (data.world ?? null),
    name: data.name ?? null,
    filters: scheduled ? null : buildFilters(data),
    contentTemplate: normalizeContentTemplate(data.contentTemplate),
    ...scheduleConfig(triggerType, data),
    ...scheduledMessageFields(ownerType, scheduled ? data : null),
    enabled: data.enabled ?? true,
    dedupeWindowSeconds: 0,
  };
};

export const updateNotificationRuleValues = (
  ownerType: NotificationOwnerTypeValue,
  existing: ExistingRule,
  data: UpdateNotificationRuleDto,
) => {
  const triggerType =
    (data.triggerType as NotificationTriggerTypeValue | undefined) ??
    existing.triggerType;
  const scheduled = isScheduledMessage(triggerType);
  if (!scheduled) validateNpcSelection(data);
  const hasFilterUpdate =
    data.npcId !== undefined ||
    data.npcIds !== undefined ||
    data.itemId !== undefined ||
    data.itemIds !== undefined;
  return {
    triggerType,
    world: scheduled
      ? null
      : hasOwnField(data, "world")
        ? (data.world ?? null)
        : existing.world,
    name: hasOwnField(data, "name") ? (data.name ?? null) : existing.name,
    filters: scheduled
      ? null
      : hasFilterUpdate
        ? buildFilters(data)
        : (existing.filters as JsonValue | null),
    contentTemplate: hasOwnField(data, "contentTemplate")
      ? normalizeContentTemplate(data.contentTemplate)
      : existing.contentTemplate,
    ...scheduleConfig(triggerType, data, existing),
    ...scheduledMessageFields(ownerType, scheduled ? data : null, existing),
    enabled: data.enabled ?? existing.enabled,
    dedupeWindowSeconds: existing.dedupeWindowSeconds,
  };
};
