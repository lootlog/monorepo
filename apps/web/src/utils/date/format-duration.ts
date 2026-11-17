import { useTranslation } from "react-i18next";

/**
 * - `human`: "45s", "4m 30s", "2h 5m"; zero parts drop.
 * - `compact`: "4:30" under an hour, "2h 5m" from one; "0:00" when none.
 * - `minutesSeconds`: "64m 5s", minutes uncapped; negative counts as zero.
 * - `clock`: "4:05" or "1:04:05", leading part unpadded.
 * - `countdown`: "04:05" under an hour, "01:04:05" under a day, then "2d 3h".
 */
export type DurationStyle =
  | "human"
  | "compact"
  | "minutesSeconds"
  | "clock"
  | "countdown";

const pad = (value: number) => String(value).padStart(2, "0");

const formatHuman = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const formatCompact = (seconds: number) => {
  if (seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);

  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  return `${minutes}:${pad(seconds % 60)}`;
};

const formatMinutesSeconds = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));

  return `${Math.floor(wholeSeconds / 60)}m ${wholeSeconds % 60}s`;
};

const formatClock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
};

const formatCountdown = (seconds: number) => {
  if (seconds < 3600)
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

  if (seconds < 86_400) {
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  }

  return `${Math.floor(seconds / 86_400)}d ${Math.floor((seconds % 86_400) / 3600)}h`;
};

const FORMATTERS: Record<DurationStyle, (seconds: number) => string> = {
  human: formatHuman,
  compact: formatCompact,
  minutesSeconds: formatMinutesSeconds,
  clock: formatClock,
  countdown: formatCountdown,
};

/** A duration in whole seconds, in one of the app's fixed styles. */
export const formatDuration = (seconds: number, style: DurationStyle) =>
  FORMATTERS[style](seconds);

/** Time spent online, in hours and minutes, as statistics show it. */
export const useFormatOnlineDuration = () => {
  const { t } = useTranslation();

  return (seconds: number) =>
    t("statistics.duration", {
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    });
};
