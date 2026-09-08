import { addDays, getLocalDate, toUtcDateFromLocal } from "@lootlog/datetime";
import type { GroupFightPeriod } from "@lootlog/schema/group-fights";

const PERIOD_HOURS = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "14d": 336,
  "30d": 720,
  "90d": 2160,
} as const;
const TIME_ZONE = "Europe/Warsaw";

/** Calendar filters follow Polish local days, with Monday starting the week. */
/** A single Polish calendar day, given as YYYY-MM-DD. */
export const getGroupFightDayRange = (
  day: string | undefined,
): { from: Date; to: Date } | undefined => {
  if (!day) return undefined;
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    dayOfMonth === undefined ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(dayOfMonth)
  )
    return undefined;
  const localDay = { year, month, day: dayOfMonth };
  return {
    from: toUtcDateFromLocal(localDay, 0, 0, TIME_ZONE),
    to: toUtcDateFromLocal(addDays(localDay, 1), 0, 0, TIME_ZONE),
  };
};

export const getGroupFightPeriodStart = (
  period: GroupFightPeriod | undefined,
  now = new Date(),
): Date | undefined => {
  if (!period || period === "all") return undefined;
  if (period === "today" || period === "week" || period === "month") {
    let date = getLocalDate(now, TIME_ZONE);
    if (period === "month") date = { ...date, day: 1 };
    if (period === "week") {
      const weekday = new Date(
        Date.UTC(date.year, date.month - 1, date.day),
      ).getUTCDay();
      date = addDays(date, -((weekday + 6) % 7));
    }
    return toUtcDateFromLocal(date, 0, 0, TIME_ZONE);
  }
  const periodStart = new Date(now);
  periodStart.setUTCHours(periodStart.getUTCHours() - PERIOD_HOURS[period]);
  periodStart.setUTCMinutes(0, 0, 0);
  return periodStart;
};
