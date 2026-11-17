import { useSecondClockValue } from "@/hooks/utils/use-second-clock-value";

interface TimeRemaining {
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const EXPIRED_SECONDS = -1;

export const useCountdown = (targetDate: string | null): TimeRemaining => {
  // Whole seconds left, or -1 once the target has passed.
  const remainingSeconds = useSecondClockValue(() => {
    if (!targetDate) return EXPIRED_SECONDS;

    const difference = new Date(targetDate).getTime() - Date.now();

    return difference <= 0 ? EXPIRED_SECONDS : Math.floor(difference / 1000);
  }, Boolean(targetDate));

  if (remainingSeconds === EXPIRED_SECONDS) {
    return { minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    minutes: Math.floor(remainingSeconds / 60),
    seconds: remainingSeconds % 60,
    isExpired: false,
  };
};
