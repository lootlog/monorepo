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
