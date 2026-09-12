export const MAX_DURATION_SECONDS = 300 * 3600;

const SECONDS_IN_HOUR = 3600;

const SECONDS_IN_MINUTE = 60;

const DURATION_PATTERN = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;

/** Parses `1h 2m 3s`-style input; malformed input yields 0 and the result is capped. */
export const parseDurationToSeconds = (input: string): number => {
  const normalizedInput = input.trim();

  if (normalizedInput.length === 0) {
    return 0;
  }

  const match = normalizedInput.match(DURATION_PATTERN);

  if (!match) return 0;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;

  const totalSeconds =
    Number(hours) * SECONDS_IN_HOUR +
    Number(minutes) * SECONDS_IN_MINUTE +
    Number(seconds);

  return Math.min(totalSeconds, MAX_DURATION_SECONDS);
};

/** `1h 2m 3s`; the inverse of `parseDurationToSeconds` for values within the cap. */
export const formatSecondsToDuration = (seconds: number): string => {
  const h = Math.floor(seconds / SECONDS_IN_HOUR);
  const m = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
  const s = seconds % SECONDS_IN_MINUTE;

  return `${h}h ${m}m ${s}s`;
};
