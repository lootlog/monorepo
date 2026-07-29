import {
  getLocalDate,
  getLocalTime,
  toUtcDateFromLocal,
} from "@lootlog/datetime";

export const GUILD_NOTIFICATION_TIMEZONE = "Europe/Warsaw" as const;

export const formatDateTimeLocalInputValue = (
  value: string | null | undefined,
  timeZone: string,
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = getLocalDate(date, timeZone);
  const localTime = getLocalTime(date, timeZone);

  return `${localDate.year.toString().padStart(4, "0")}-${localDate.month.toString().padStart(2, "0")}-${localDate.day.toString().padStart(2, "0")}T${localTime.hour.toString().padStart(2, "0")}:${localTime.minute.toString().padStart(2, "0")}`;
};

export const parseDateTimeLocalInputToIsoString = (
  value: string | null | undefined,
  timeZone: string,
) => {
  if (!value) {
    return undefined;
  }

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return undefined;
  }

  const [yearRaw, monthRaw, dayRaw] = datePart.split("-");
  const [hourRaw, minuteRaw] = timePart.split(":");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  const hour = Number.parseInt(hourRaw ?? "", 10);
  const minute = Number.parseInt(minuteRaw ?? "", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return undefined;
  }

  return toUtcDateFromLocal(
    { year, month, day },
    hour,
    minute,
    timeZone,
  ).toISOString();
};

export const formatNotificationDateInTimeZone = (
  value: string | Date,
  timeZone: string,
) => {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
};
