import { formatDuration } from "date-fns";
import { pl } from "date-fns/locale";

const MINUTE_MS = 60_000;

const HOUR_MS = 60 * MINUTE_MS;

const DAY_MS = 24 * HOUR_MS;

/** "27 dni 5 godzin", "3 godziny 12 minut"; `null` once less than a minute is left. */
export const formatFactionWarRemaining = (from: number, to: number) => {
  const remaining = to - from;

  if (remaining < MINUTE_MS) return null;

  // Whole days rather than calendar months: a month-long war still reads in days.
  const duration = {
    days: Math.floor(remaining / DAY_MS),
    hours: Math.floor((remaining % DAY_MS) / HOUR_MS),
    minutes: Math.floor((remaining % HOUR_MS) / MINUTE_MS),
  };

  return formatDuration(duration, {
    format: remaining >= DAY_MS ? ["days", "hours"] : ["hours", "minutes"],
    locale: pl,
  });
};
