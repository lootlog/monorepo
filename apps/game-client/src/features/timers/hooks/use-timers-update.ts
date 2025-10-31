import { useEffect, useState, useRef } from "react";
import {
  calculateTimeLeft,
  filterTimersByRemovalTime,
  type TimerWithTimeLeft,
} from "../utils/timers-utils";

export const useTimersUpdate = (
  activeTimers: TimerWithTimeLeft[],
  removeTimerAfterMs: number,
) => {
  const [calculatedTimers, setCalculatedTimers] =
    useState<TimerWithTimeLeft[]>(activeTimers);

  const activeTimersRef = useRef(activeTimers);

  useEffect(() => {
    activeTimersRef.current = activeTimers;
    setCalculatedTimers(activeTimers);
  }, [activeTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCalculatedTimers((prev) => {
        const updated = calculateTimeLeft(prev);
        const filtered = filterTimersByRemovalTime(updated, removeTimerAfterMs);
        return filtered;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [removeTimerAfterMs]);

  return calculatedTimers;
};
