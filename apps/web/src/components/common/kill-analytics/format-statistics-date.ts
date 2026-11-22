import { createCachedFormatter, MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const getFullDateFormatter = createCachedFormatter(PRODUCT_LOCALE, {});

const getDayMonthFormatter = createCachedFormatter(PRODUCT_LOCALE, {
  day: "numeric",
  month: "2-digit",
});

const getHourFormatter = createCachedFormatter(PRODUCT_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
});

const getDateHourFormatter = createCachedFormatter(PRODUCT_LOCALE, {
  day: "numeric",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const getWeekdayFormatter = createCachedFormatter(PRODUCT_LOCALE, {
  weekday: "long",
});

const getShortWeekdayFormatter = createCachedFormatter(PRODUCT_LOCALE, {
  weekday: "short",
});

const toUtcMidnight = (date: string) => new Date(`${date}T00:00:00Z`);

export const formatStatisticsDate = (date: string) =>
  getFullDateFormatter("UTC").format(toUtcMidnight(date));

export const formatStatisticsDay = (date: string) =>
  getDayMonthFormatter("UTC").format(toUtcMidnight(date));

export const formatStatisticsHour = (instant: string) =>
  getHourFormatter(MARGONEM_TIME_ZONE).format(new Date(instant));

export const formatStatisticsInstantDay = (instant: string) =>
  getDayMonthFormatter(MARGONEM_TIME_ZONE).format(new Date(instant));

export const formatStatisticsDateHour = (instant: string) =>
  getDateHourFormatter(MARGONEM_TIME_ZONE).format(new Date(instant));

export const formatStatisticsWeekdayDate = (date: string) =>
  `${getWeekdayFormatter("UTC").format(toUtcMidnight(date))}, ${formatStatisticsDate(date)}`;

export const formatIsoWeekday = (weekday: number, short = false) =>
  (short ? getShortWeekdayFormatter : getWeekdayFormatter)("UTC").format(
    new Date(Date.UTC(2026, 0, 4 + weekday, 12)),
  );
