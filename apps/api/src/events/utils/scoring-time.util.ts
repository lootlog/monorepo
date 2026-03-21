type LocalDate = {
  year: number;
  month: number;
  day: number;
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  timeZone: string,
  createFormatter: () => Intl.DateTimeFormat,
): Intl.DateTimeFormat {
  const cached = cache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = createFormatter();
  cache.set(timeZone, formatter);
  return formatter;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  return getCachedFormatter(dateFormatterCache, timeZone, () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  });
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  return getCachedFormatter(timeFormatterCache, timeZone, () => {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  });
}

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  return getCachedFormatter(offsetFormatterCache, timeZone, () => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  });
}

function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function parseWindowClock(clock: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = clock.split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function getLocalDate(date: Date, timeZone: string): LocalDate {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  return {
    year: Number.parseInt(getPartValue(parts, "year"), 10),
    month: Number.parseInt(getPartValue(parts, "month"), 10),
    day: Number.parseInt(getPartValue(parts, "day"), 10),
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
