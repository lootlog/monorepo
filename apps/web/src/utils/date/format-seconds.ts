import { intervalToDuration } from "date-fns";

export function formatSeconds(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const duration = intervalToDuration({
    start: 0,
    end: normalizedSeconds * 1000,
  });

  const totalMinutes = (duration.hours ?? 0) * 60 + (duration.minutes ?? 0);
  const remainingSeconds = duration.seconds ?? 0;

  return `${totalMinutes}m ${remainingSeconds}s`;
}
