import type {
  GuildKillStatsResponseDtoOutputHourlyWeekdayItem,
  GuildKillStatsResponseDtoOutputTimelinePointsItem,
} from "@lootlog/client/main";
import { maxBy } from "es-toolkit";

/**
 * The busiest timeline point, the longest run of consecutive points with
 * kills, and the busiest weekday hour; null when nothing was killed.
 */
export function summarizeKillRecords(
  points: GuildKillStatsResponseDtoOutputTimelinePointsItem[],
  cells: GuildKillStatsResponseDtoOutputHourlyWeekdayItem[],
) {
  const best = maxBy(points, (point) => point.kills);
  const peak = maxBy(cells, (cell) => cell.kills);

  if (!best || best.kills === 0 || !peak) return null;

  let streak = 0;
  let longestStreak = 0;

  for (const point of points) {
    streak = point.kills > 0 ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }

  return { best, longestStreak, peak };
}
