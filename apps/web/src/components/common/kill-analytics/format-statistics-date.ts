import { createCachedFormatter } from "@lootlog/datetime";

// The analytics response carries calendar dates ("2026-09-14") already
// resolved in the player's time zone, so they are formatted as UTC midnight to
// keep the day from shifting.
const getFullDateFormatter = createCachedFormatter("pl-PL", {});

const getDayMonthFormatter = createCachedFormatter("pl-PL", {
  day: "numeric",
  month: "2-digit",
});

const getHourFormatter = createCachedFormatter("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
});

const getDateHourFormatter = createCachedFormatter("pl-PL", {
  day: "numeric",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const getWeekdayFormatter = createCachedFormatter("pl-PL", {
  weekday: "long",
});

const getShortWeekdayFormatter = createCachedFormatter("pl-PL", {
  weekday: "short",
});

const toUtcMidnight = (date: string) => new Date(`${date}T00:00:00Z`);

/** "2026-09-14" → "14.09.2026" */
export const formatStatisticsDate = (date: string) =>
  getFullDateFormatter("UTC").format(toUtcMidnight(date));

/** "2026-09-08" → "8.09", for chart axes. */
export const formatStatisticsDay = (date: string) =>
  getDayMonthFormatter("UTC").format(toUtcMidnight(date));

// Hourly points are instants ("2026-09-14T08:00:00.000Z") shown in Polish time.

/** "2026-09-14T08:00:00.000Z" → "10:00", for chart axes. */
export const formatStatisticsHour = (instant: string) =>
  getHourFormatter("Europe/Warsaw").format(new Date(instant));

/** "2026-09-14T08:00:00.000Z" → "14.09.2026, 10:00" */
export const formatStatisticsDateHour = (instant: string) =>
  getDateHourFormatter("Europe/Warsaw").format(new Date(instant));

/** "2026-08-09" → "niedziela, 9.08.2026" */
export const formatStatisticsWeekdayDate = (date: string) =>
  `${getWeekdayFormatter("UTC").format(toUtcMidnight(date))}, ${formatStatisticsDate(date)}`;

/** ISO weekday (1 = Monday) → "poniedziałek", or "pon." when short. */
export const formatIsoWeekday = (weekday: number, short = false) =>
  (short ? getShortWeekdayFormatter : getWeekdayFormatter)("UTC").format(
    // 5 January 2026 is a Monday.
    new Date(Date.UTC(2026, 0, 4 + weekday, 12)),
  );

/** Collapses a range that starts and ends on the same day to that day. */
export const formatStatisticsDateRange = (
  startDate: string,
  endDate: string,
) =>
  startDate === endDate
    ? formatStatisticsDate(startDate)
    : `${formatStatisticsDate(startDate)} – ${formatStatisticsDate(endDate)}`;
