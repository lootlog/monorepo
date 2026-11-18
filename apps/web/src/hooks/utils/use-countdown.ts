import { useSecondClockValue } from "@/hooks/utils/use-second-clock-value";

interface TimeRemaining {
  minutes: number;
  seconds: number;
  /** Remaining time as `m:ss`, the one format every cooldown shows. */
  label: string;
  isExpired: boolean;
}

const EXPIRED_SECONDS = -1;

/** Counts down to an ISO date or epoch milliseconds; `null` is expired. */
export const useCountdown = (
  target: string | number | null | undefined,
): TimeRemaining => {
  const hasTarget = target !== null && target !== undefined;

  // Whole seconds left, rounded up so 0:00 never shows while still waiting,
  // or -1 once the target has passed.
  const remainingSeconds = useSecondClockValue(() => {
    if (!hasTarget) return EXPIRED_SECONDS;

    const difference = new Date(target).getTime() - Date.now();

    return difference <= 0 ? EXPIRED_SECONDS : Math.ceil(difference / 1000);
  }, hasTarget);

  if (remainingSeconds === EXPIRED_SECONDS) {
    return { minutes: 0, seconds: 0, label: "0:00", isExpired: true };
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return {
    minutes,
    seconds,
    label: `${minutes}:${seconds.toString().padStart(2, "0")}`,
    isExpired: false,
  };
};
