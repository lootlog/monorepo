import { intervalToDuration } from "date-fns";

export function formatSeconds(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const {
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({
    start: 0,
    end: secs * 1000,
  });

  const totalMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
  return `${totalMinutes}m ${seconds ?? 0}s`;
}
