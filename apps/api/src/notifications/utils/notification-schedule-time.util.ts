import { NotificationScheduleIntervalType } from "src/generated/prisma/client";
import {
  addDays,
  getDateFormatter,
  getLocalDate,
  toUtcDateFromLocal,
} from "src/shared/utils/timezone.util";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    getDateFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isRecurringScheduleInterval(
  intervalType: NotificationScheduleIntervalType,
): boolean {
  return (
    intervalType === NotificationScheduleIntervalType.DAILY ||
    intervalType === NotificationScheduleIntervalType.WEEKLY
  );
}

export function calculateFirstOccurrenceInTimeZone(params: {
  intervalType: NotificationScheduleIntervalType;
  timeOfDay: string;
  timeZone: string;
  weekday?: number | null;
  now?: Date;
}): Date {
  const [hours, minutes] = params.timeOfDay.split(":").map(Number);
  const now = params.now ?? new Date();
  const currentLocalDate = getLocalDate(now, params.timeZone);
  let candidateLocalDate = currentLocalDate;
  let candidate = toUtcDateFromLocal(
    candidateLocalDate,
    hours ?? 0,
    minutes ?? 0,
    params.timeZone,
  );

  if (
    params.intervalType === NotificationScheduleIntervalType.WEEKLY &&
    params.weekday !== null &&
    params.weekday !== undefined
  ) {
    const currentWeekday = new Date(
      Date.UTC(
        currentLocalDate.year,
        currentLocalDate.month - 1,
        currentLocalDate.day,
      ),
    ).getUTCDay();

    let daysUntil = params.weekday - currentWeekday;
    if (daysUntil < 0) {
      daysUntil += 7;
    }

    candidateLocalDate = addDays(currentLocalDate, daysUntil);
    candidate = toUtcDateFromLocal(
      candidateLocalDate,
      hours ?? 0,
      minutes ?? 0,
      params.timeZone,
    );

    if (candidate.getTime() <= now.getTime()) {
      candidateLocalDate = addDays(candidateLocalDate, 7);
      candidate = toUtcDateFromLocal(
        candidateLocalDate,
        hours ?? 0,
        minutes ?? 0,
        params.timeZone,
      );
    }

    return candidate;
  }

  if (candidate.getTime() <= now.getTime()) {
    candidateLocalDate = addDays(candidateLocalDate, 1);
    candidate = toUtcDateFromLocal(
      candidateLocalDate,
      hours ?? 0,
      minutes ?? 0,
      params.timeZone,
    );
  }

  return candidate;
}

export function calculateNextOccurrenceInTimeZone(params: {
  currentScheduledAt: Date;
  intervalType: NotificationScheduleIntervalType;
  intervalValue: number | null;
  weekday: number | null;
  timeOfDay: string | null;
  timeZone: string;
}): Date | null {
  const {
    currentScheduledAt,
    intervalType,
    intervalValue,
    weekday,
    timeOfDay,
    timeZone,
  } = params;

  switch (intervalType) {
    case NotificationScheduleIntervalType.HOURLY: {
      if (!intervalValue || intervalValue < 1) {
        return null;
      }

      const next = new Date(currentScheduledAt);
      next.setUTCHours(next.getUTCHours() + intervalValue);
      return next;
    }
    case NotificationScheduleIntervalType.DAILY: {
      if (!timeOfDay) {
        return null;
      }

      const [hours, minutes] = timeOfDay.split(":").map(Number);
      const nextLocalDate = addDays(
        getLocalDate(currentScheduledAt, timeZone),
        1,
      );

      return toUtcDateFromLocal(
        nextLocalDate,
        hours ?? 0,
        minutes ?? 0,
        timeZone,
      );
    }
    case NotificationScheduleIntervalType.WEEKLY: {
      if (!timeOfDay || weekday === null) {
        return null;
      }

      const [hours, minutes] = timeOfDay.split(":").map(Number);
      const nextLocalDate = addDays(
        getLocalDate(currentScheduledAt, timeZone),
        7,
      );

      return toUtcDateFromLocal(
        nextLocalDate,
        hours ?? 0,
        minutes ?? 0,
        timeZone,
      );
    }
    default:
      return null;
  }
}
