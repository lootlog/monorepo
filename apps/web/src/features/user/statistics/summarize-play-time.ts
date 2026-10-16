import { maxBy, sum } from "es-toolkit";

type OnlineDay = {
  date: string;
  onlineSeconds: number | null;
  /** Only part of the day is covered, such as the day tracking began. */
  partial?: boolean;
};

type KillDay = { date: string; kills: number | null };

/**
 * Time online in a period and the kills made during it. Kills per hour count
 * only whole days whose online time is known: a day before tracking began, or
 * one only partly covered, would set a full day's kills against too little
 * time and inflate the rate.
 */
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
