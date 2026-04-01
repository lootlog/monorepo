import { NotificationScheduleIntervalType } from "prisma/generated/client";

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

function createCachedFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): (timeZone: string) => Intl.DateTimeFormat {
  const cache = new Map<string, Intl.DateTimeFormat>();

  return (timeZone: string) => {
    const cached = cache.get(timeZone);
    if (cached) {
      return cached;
    }

    const formatter = new Intl.DateTimeFormat(locale, { timeZone, ...options });
    cache.set(timeZone, formatter);
    return formatter;
  };
}

const getDateFormatter = createCachedFormatter("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getTimeFormatter = createCachedFormatter("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const getOffsetFormatter = createCachedFormatter("en-US", {
  timeZoneName: "shortOffset",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getLocalDate(date: Date, timeZone: string): LocalDate {
  const parts = getDateFormatter(timeZone).formatToParts(date);

  return {
    year: Number.parseInt(getPartValue(parts, "year"), 10),
    month: Number.parseInt(getPartValue(parts, "month"), 10),
    day: Number.parseInt(getPartValue(parts, "day"), 10),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = getOffsetFormatter(timeZone).formatToParts(date);
  const offsetToken = getPartValue(parts, "timeZoneName");

  if (!offsetToken || offsetToken === "GMT" || offsetToken === "UTC") {
    return 0;
  }

  const match = offsetToken.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
}

function toUtcDateFromLocal(
  localDate: LocalDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuessMs = Date.UTC(
    localDate.year,
    localDate.month - 1,
    localDate.day,
    hour,
    minute,
    0,
    0,
  );

  const firstOffset = getTimeZoneOffsetMinutes(new Date(utcGuessMs), timeZone);
  let resultMs = utcGuessMs - firstOffset * 60_000;

  const secondOffset = getTimeZoneOffsetMinutes(new Date(resultMs), timeZone);
  if (secondOffset !== firstOffset) {
    resultMs = utcGuessMs - secondOffset * 60_000;
  }

  return new Date(resultMs);
}

function addDays(localDate: LocalDate, days: number): LocalDate {
  const asUtc = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day),
  );
  asUtc.setUTCDate(asUtc.getUTCDate() + days);

  return {
    year: asUtc.getUTCFullYear(),
    month: asUtc.getUTCMonth() + 1,
    day: asUtc.getUTCDate(),
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    getDateFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
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
