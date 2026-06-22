import { MAX_DURATION_SECONDS } from "@/features/timers/constants/max-duration-seconds";

const DURATION_PATTERN = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

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
