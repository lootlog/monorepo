import { maxBy, sum } from "es-toolkit";

type OnlineDay = { date: string; onlineSeconds: number | null };

type KillDay = { date: string; kills: number | null };

/**
 * Time online in a period and the kills made during it. Kills per hour count
 * only days whose online time is known, so days before tracking began never
 * inflate the rate.
 */
export function summarizePlayTime(
  onlineDays: readonly OnlineDay[],
  killDays: readonly KillDay[],
) {
  const known = onlineDays.filter(
    (day): day is { date: string; onlineSeconds: number } =>
      day.onlineSeconds !== null,
  );

  const played = known.filter((day) => day.onlineSeconds > 0);
  const totalSeconds = sum(played.map((day) => day.onlineSeconds));
  const playedDates = new Set(played.map((day) => day.date));

  const killsWhileOnline = sum(
    killDays.map((day) => (playedDates.has(day.date) ? (day.kills ?? 0) : 0)),
  );

  const longest = maxBy(played, (day) => day.onlineSeconds);

  return {
    totalSeconds,
    playedDays: played.length,
    averageSeconds: played.length ? totalSeconds / played.length : null,
    killsPerHour: totalSeconds
      ? killsWhileOnline / (totalSeconds / 3600)
      : null,
    longest: longest
      ? { date: longest.date, seconds: longest.onlineSeconds }
      : null,
  };
}
