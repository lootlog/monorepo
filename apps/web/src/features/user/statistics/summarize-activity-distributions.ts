import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";

export function summarizeActivityDistributions(
  cells: UserKillAnalyticsResponseDtoOutput["hourlyWeekday"],
) {
  const hourly = new Map<number, number>();
  const weekdays = new Map<number, number>();
  for (const cell of cells) {
    hourly.set(cell.hour, (hourly.get(cell.hour) ?? 0) + cell.kills);
    weekdays.set(cell.weekday, (weekdays.get(cell.weekday) ?? 0) + cell.kills);
  }
  return {
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      kills: hourly.get(hour) ?? 0,
    })),
    weekdays: Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      kills: weekdays.get(index + 1) ?? 0,
    })),
  };
}
