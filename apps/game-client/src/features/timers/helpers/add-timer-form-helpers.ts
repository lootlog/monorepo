import { MAX_DURATION_SECONDS } from "@/features/timers/constants/max-duration-seconds";

export const parseDurationToSeconds = (input: string): number => {
  const normalizedInput = input.trim();

  if (normalizedInput.length === 0) {
    return 0;
  }

  const regex = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;
  const match = normalizedInput.match(regex);
  if (!match) return 0;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  const totalSeconds =
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

  return Math.min(totalSeconds, MAX_DURATION_SECONDS);
};
