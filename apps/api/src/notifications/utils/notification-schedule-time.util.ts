import { NotificationScheduleIntervalType } from "src/generated/prisma/client";
import {
  type LocalDate,
  addDays,
  getDateFormatter,
  getLocalDate,
  toUtcDateFromLocal,
} from "@lootlog/datetime";

type TimeOfDayParts = {
  hours: number;
  minutes: number;
};

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

function parseTimeOfDay(timeOfDay: string): TimeOfDayParts {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  return {
    hours: hours ?? 0,
    minutes: minutes ?? 0,
  };
}

function toUtcDateFromLocalTimeOfDay(
  localDate: LocalDate,
  timeOfDay: string,
  timeZone: string,
): Date {
  const { hours, minutes } = parseTimeOfDay(timeOfDay);
  return toUtcDateFromLocal(localDate, hours, minutes, timeZone);
}

export function calculateFirstOccurrenceInTimeZone(params: {
  intervalType: NotificationScheduleIntervalType;
  timeOfDay: string;
  timeZone: string;
  weekday?: number | null;
  now?: Date;
}): Date {
  const now = params.now ?? new Date();
  const currentLocalDate = getLocalDate(now, params.timeZone);
  let candidateLocalDate = currentLocalDate;
  let candidate = toUtcDateFromLocalTimeOfDay(
    candidateLocalDate,
    params.timeOfDay,
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
    candidate = toUtcDateFromLocalTimeOfDay(
      candidateLocalDate,
      params.timeOfDay,
      params.timeZone,
    );

    if (candidate.getTime() <= now.getTime()) {
      candidateLocalDate = addDays(candidateLocalDate, 7);
      candidate = toUtcDateFromLocalTimeOfDay(
        candidateLocalDate,
        params.timeOfDay,
        params.timeZone,
      );
    }

    return candidate;
  }

  if (candidate.getTime() <= now.getTime()) {
    candidateLocalDate = addDays(candidateLocalDate, 1);
    candidate = toUtcDateFromLocalTimeOfDay(
      candidateLocalDate,
      params.timeOfDay,
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

      const nextLocalDate = addDays(
        getLocalDate(currentScheduledAt, timeZone),
        1,
      );

      return toUtcDateFromLocalTimeOfDay(nextLocalDate, timeOfDay, timeZone);
    }
    case NotificationScheduleIntervalType.WEEKLY: {
      if (!timeOfDay || weekday === null) {
        return null;
      }

      const nextLocalDate = addDays(
        getLocalDate(currentScheduledAt, timeZone),
        7,
      );

      return toUtcDateFromLocalTimeOfDay(nextLocalDate, timeOfDay, timeZone);
    }
    default:
      return null;
  }
}
