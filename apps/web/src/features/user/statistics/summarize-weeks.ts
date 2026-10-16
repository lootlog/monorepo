import { sum } from "es-toolkit";
import { calendarOffset } from "@/components/common/activity-heatmap/activity-calendar";

type KillDay = { date: string; kills: number | null };

/**
 * This week's kills next to the previous week's, Monday to Sunday. The
 * totals compare the same days of both weeks, up to today, so a week that
 * has just begun is not measured against a whole one.
 */
export function summarizeWeeks(daily: readonly KillDay[]) {
  const today = daily[daily.length - 1];

  if (!today) return null;

  const todayIndex = daily.length - 1;
  const weekday = calendarOffset(today.date);
  const mondayIndex = todayIndex - weekday;

  const days = Array.from({ length: 7 }, (_, offset) => ({
    weekday: offset + 1,
    current:
      offset <= weekday ? (daily[mondayIndex + offset]?.kills ?? null) : null,
    previous: daily[mondayIndex - 7 + offset]?.kills ?? null,
  }));

  const toDate = days.slice(0, weekday + 1);

  return {
    days,
    currentKills: sum(toDate.map((day) => day.current ?? 0)),
    previousKills: sum(toDate.map((day) => day.previous ?? 0)),
  };
}
