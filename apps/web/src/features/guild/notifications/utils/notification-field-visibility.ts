import {
  type CreateNotificationRuleDtoTriggerType,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
} from "@lootlog/client/main";

export const getNotificationFieldVisibility = (
  triggerType: CreateNotificationRuleDtoTriggerType,
  intervalType: NotificationScheduleIntervalType | undefined,
) => {
  const isScheduledMessage =
    triggerType === NotificationTriggerType.SCHEDULED_MESSAGE;

  const isRecurring =
    isScheduledMessage &&
    intervalType !== undefined &&
    intervalType !== NotificationScheduleIntervalType.ONCE;

  return {
    isScheduledMessage,
    isRecurring,
    showScheduledAtField:
      isScheduledMessage &&
      (intervalType === NotificationScheduleIntervalType.ONCE ||
        intervalType === NotificationScheduleIntervalType.HOURLY),
    showTimeOfDayField:
      isScheduledMessage &&
      (intervalType === NotificationScheduleIntervalType.DAILY ||
        intervalType === NotificationScheduleIntervalType.WEEKLY),
    showWeekdayField:
      isScheduledMessage &&
      intervalType === NotificationScheduleIntervalType.WEEKLY,
    showIntervalValueField:
      isScheduledMessage &&
      intervalType === NotificationScheduleIntervalType.HOURLY,
  };
};
