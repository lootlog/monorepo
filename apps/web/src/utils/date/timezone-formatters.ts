type LocalDate = {
  year: number;
  month: number;
  day: number;
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = dateFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  dateFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = timeFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  timeFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
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
  offsetFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function getPartValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getLocalDate(date: Date, timeZone: string): LocalDate {
  const parts = getDateFormatter(timeZone).formatToParts(date);

  return {
    year: Number.parseInt(getPartValue(parts, "year"), 10),
    month: Number.parseInt(getPartValue(parts, "month"), 10),
    day: Number.parseInt(getPartValue(parts, "day"), 10),
  };
}

export function getLocalTime(
  date: Date,
  timeZone: string,
): { hour: number; minute: number } {
  const parts = getTimeFormatter(timeZone).formatToParts(date);

  return {
    hour: Number.parseInt(getPartValue(parts, "hour"), 10),
    minute: Number.parseInt(getPartValue(parts, "minute"), 10),
  };
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
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

export function toUtcDateFromLocal(
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

export function addDays(localDate: LocalDate, days: number): LocalDate {
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

export function localDateKey(localDate: LocalDate): number {
  return localDate.year * 10_000 + localDate.month * 100 + localDate.day;
}

export type { LocalDate };
