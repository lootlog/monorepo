import { sum } from "es-toolkit";
import { calendarOffset } from "@/components/common/activity-heatmap/activity-calendar";

type KillDay = { date: string; kills: number | null };

/**
 * This week's kills next to the previous week's, Monday to Sunday. The
 * totals compare the same days of both weeks, up to today, so a week that
 * has just begun is not measured against a whole one. A total is null when
 * any of its days has no history, rather than counting that day as zero.
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

  const total = (kills: (number | null)[]) =>
    kills.some((value) => value === null)
      ? null
      : sum(kills.map((value) => value ?? 0));

  return {
    days,
    currentKills: total(toDate.map((day) => day.current)),
    previousKills: total(toDate.map((day) => day.previous)),
  };
}
