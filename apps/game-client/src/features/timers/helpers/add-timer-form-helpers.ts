import { MAX_DURATION_SECONDS } from "@/features/timers/constants/max-duration-seconds";

export const parseDurationToSeconds = (input: string): number => {
  const regex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i;
  const match = input.match(regex);
  if (!match) return 0;

  const [, hours, minutes, seconds] = match.map(Number);
  const totalSeconds =
    (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);

  return Math.min(totalSeconds, MAX_DURATION_SECONDS);
};
