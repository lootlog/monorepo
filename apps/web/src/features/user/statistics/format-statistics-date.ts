import { createCachedFormatter } from "@lootlog/datetime";

// The analytics response carries calendar dates ("2026-09-14") already
// resolved in the player's time zone, so they are formatted as UTC midnight to
// keep the day from shifting.
const getFullDateFormatter = createCachedFormatter("pl-PL", {});

const getDayMonthFormatter = createCachedFormatter("pl-PL", {
  day: "numeric",
  month: "2-digit",
});

const toUtcMidnight = (date: string) => new Date(`${date}T00:00:00Z`);

/** "2026-09-14" → "14.09.2026" */
export const formatStatisticsDate = (date: string) =>
  getFullDateFormatter("UTC").format(toUtcMidnight(date));

/** "2026-09-08" → "8.09", for chart axes. */
export const formatStatisticsDay = (date: string) =>
  getDayMonthFormatter("UTC").format(toUtcMidnight(date));

/** Collapses a range that starts and ends on the same day to that day. */
export const formatStatisticsDateRange = (
  startDate: string,
  endDate: string,
) =>
  startDate === endDate
    ? formatStatisticsDate(startDate)
    : `${formatStatisticsDate(startDate)} – ${formatStatisticsDate(endDate)}`;
