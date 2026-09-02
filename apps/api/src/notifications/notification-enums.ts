export const NotificationJobKind = {
  SCHEDULED: "SCHEDULED",
  INSTANT: "INSTANT",
  TEST: "TEST",
} as const;
export type NotificationJobKind =
  (typeof NotificationJobKind)[keyof typeof NotificationJobKind];

export const NotificationOwnerType = { GUILD: "GUILD", USER: "USER" } as const;
export type NotificationOwnerType =
  (typeof NotificationOwnerType)[keyof typeof NotificationOwnerType];

export const NotificationProvider = { DISCORD: "DISCORD" } as const;
export type NotificationProvider =
  (typeof NotificationProvider)[keyof typeof NotificationProvider];
export const NotificationTargetType = { CHANNEL: "CHANNEL", DM: "DM" } as const;
export type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];

export const NotificationTriggerType = {
  TIMER_BEFORE_SPAWN: "TIMER_BEFORE_SPAWN",
  NPC_SPAWNED: "NPC_SPAWNED",
  WATCHED_ITEM_DROPPED: "WATCHED_ITEM_DROPPED",
  SCHEDULED_MESSAGE: "SCHEDULED_MESSAGE",
} as const;
export type NotificationTriggerType =
  (typeof NotificationTriggerType)[keyof typeof NotificationTriggerType];

export const NotificationScheduleStrategy = {
  SPAWN_WINDOW_RELATIVE: "SPAWN_WINDOW_RELATIVE",
  FIXED_DATETIME: "FIXED_DATETIME",
} as const;
export type NotificationScheduleStrategy =
  (typeof NotificationScheduleStrategy)[keyof typeof NotificationScheduleStrategy];
export const NotificationScheduleAnchor = {
  MIN_SPAWN: "MIN_SPAWN",
  MAX_SPAWN: "MAX_SPAWN",
} as const;
export type NotificationScheduleAnchor =
  (typeof NotificationScheduleAnchor)[keyof typeof NotificationScheduleAnchor];
export const NotificationScheduleIntervalType = {
  ONCE: "ONCE",
  HOURLY: "HOURLY",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;
export type NotificationScheduleIntervalType =
  (typeof NotificationScheduleIntervalType)[keyof typeof NotificationScheduleIntervalType];

export const NotificationJobStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  CANCELED: "CANCELED",
} as const;
export type NotificationJobStatus =
  (typeof NotificationJobStatus)[keyof typeof NotificationJobStatus];
