import {
  type LocalDate,
  addDays,
  createCachedFormatter,
  getLocalDate,
  getPartValue,
  toUtcDateFromLocal,
} from "src/shared/utils/timezone.util";

const getTimeFormatter = createCachedFormatter("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parseWindowClock(clock: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = clock.split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function getLocalTime(
  date: Date,
  timeZone: string,
): { hour: number; minute: number } {
  const parts = getTimeFormatter(timeZone).formatToParts(date);
  return {
    hour: Number.parseInt(getPartValue(parts, "hour"), 10),
    minute: Number.parseInt(getPartValue(parts, "minute"), 10),
  };
}

function localDateKey(localDate: LocalDate): number {
  return localDate.year * 10_000 + localDate.month * 100 + localDate.day;
}

export function isLocalTimeInRange(params: {
  date: Date;
  timeZone: string;
  from: string;
  to: string;
}): boolean {
  const { hour, minute } = getLocalTime(params.date, params.timeZone);
  const currentMinutes = hour * 60 + minute;
  const fromClock = parseWindowClock(params.from);
  const toClock = parseWindowClock(params.to);
  const fromMinutes = fromClock.hour * 60 + fromClock.minute;
  const toMinutes = toClock.hour * 60 + toClock.minute;

  if (fromMinutes <= toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }

  return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
}

export function calculateLocalWindowOverlapMs(params: {
  startUtc: Date;
  endUtc: Date;
  timeZone: string;
  windowFrom: string;
  windowTo: string;
}): number {
  if (params.endUtc <= params.startUtc) {
    return 0;
  }

  const fromClock = parseWindowClock(params.windowFrom);
  const toClock = parseWindowClock(params.windowTo);

  let currentLocalDate = getLocalDate(params.startUtc, params.timeZone);
  const lastLocalDate = getLocalDate(params.endUtc, params.timeZone);
  let totalOverlapMs = 0;

  while (localDateKey(currentLocalDate) <= localDateKey(lastLocalDate)) {
    const windowStartUtc = toUtcDateFromLocal(
      currentLocalDate,
      fromClock.hour,
      fromClock.minute,
      params.timeZone,
    );

    const crossesMidnight =
      toClock.hour * 60 + toClock.minute <=
      fromClock.hour * 60 + fromClock.minute;
    const windowEndDate = crossesMidnight
      ? addDays(currentLocalDate, 1)
      : currentLocalDate;
    const windowEndUtc = toUtcDateFromLocal(
      windowEndDate,
      toClock.hour,
      toClock.minute,
      params.timeZone,
    );

    const overlapStartMs = Math.max(
      params.startUtc.getTime(),
      windowStartUtc.getTime(),
    );
    const overlapEndMs = Math.min(
      params.endUtc.getTime(),
      windowEndUtc.getTime(),
    );

    if (overlapEndMs > overlapStartMs) {
      totalOverlapMs += overlapEndMs - overlapStartMs;
    }

    currentLocalDate = addDays(currentLocalDate, 1);
  }

  return totalOverlapMs;
}
