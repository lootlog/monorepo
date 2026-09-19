import { useEffect, useState } from "react";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

interface TimeRemaining {
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const EXPIRED: TimeRemaining = { minutes: 0, seconds: 0, isExpired: true };

export const useCountdown = (targetDate: string | null): TimeRemaining => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(EXPIRED);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(EXPIRED);

      return;
    }

    const calculateTimeRemaining = () => {
      const difference = new Date(targetDate).getTime() - Date.now();

      if (difference <= 0) {
        setTimeRemaining(EXPIRED);

        return;
      }

      setTimeRemaining({
        minutes: Math.floor(difference / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false,
      });
    };

    calculateTimeRemaining();

    return subscribeToSecondClock(calculateTimeRemaining);
  }, [targetDate]);

  return timeRemaining;
};
