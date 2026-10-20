import { formatDuration, intervalToDuration } from "date-fns";
import { pl } from "date-fns/locale";

const MINUTE_MS = 60_000;

const DAY_MS = 24 * 60 * MINUTE_MS;

/** "27 dni 5 godzin", "3 godziny 12 minut"; `null` once less than a minute is left. */
export const formatFactionWarRemaining = (from: number, to: number) => {
  const remaining = to - from;

  if (remaining < MINUTE_MS) return null;

  return formatDuration(intervalToDuration({ start: from, end: to }), {
    format: remaining >= DAY_MS ? ["days", "hours"] : ["hours", "minutes"],
    locale: pl,
  });
};
