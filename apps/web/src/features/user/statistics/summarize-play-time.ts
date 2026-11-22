import { maxBy, sum } from "es-toolkit";

type OnlineDay = {
  date: string;
  onlineSeconds: number | null;
  partial?: boolean;
};

type KillDay = { date: string; kills: number | null };

export function summarizePlayTime(
  onlineDays: readonly OnlineDay[],
  killDays: readonly KillDay[],
) {
  const known = onlineDays.filter(
    (day): day is OnlineDay & { onlineSeconds: number } =>
      day.onlineSeconds !== null,
  );

  const played = known.filter((day) => day.onlineSeconds > 0);
  const totalSeconds = sum(played.map((day) => day.onlineSeconds));
  const rated = played.filter((day) => !day.partial);
  const ratedSeconds = sum(rated.map((day) => day.onlineSeconds));
  const ratedDates = new Set(rated.map((day) => day.date));

  const killsWhileOnline = sum(
    killDays.map((day) => (ratedDates.has(day.date) ? (day.kills ?? 0) : 0)),
  );

  const longest = maxBy(played, (day) => day.onlineSeconds);

  return {
    totalSeconds,
    playedDays: played.length,
    averageSeconds: played.length ? totalSeconds / played.length : null,
    killsPerHour: ratedSeconds
      ? killsWhileOnline / (ratedSeconds / 3600)
      : null,
    longest: longest
      ? { date: longest.date, seconds: longest.onlineSeconds }
      : null,
  };
}
