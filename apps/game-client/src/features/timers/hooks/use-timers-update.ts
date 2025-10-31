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
  console.log("[USE_TIMERS_UPDATE] Hook called with:", {
    activeTimersCount: activeTimers.length,
    activeTimersRef: activeTimers,
    removeTimerAfterMs,
  });

  const [calculatedTimers, setCalculatedTimers] =
    useState<TimerWithTimeLeft[]>(activeTimers);

  console.log("[USE_TIMERS_UPDATE] Current state:", {
    calculatedTimersCount: calculatedTimers.length,
    calculatedTimersRef: calculatedTimers,
  });

  const activeTimersRef = useRef(activeTimers);

  useEffect(() => {
    console.log(
      "[USE_TIMERS_UPDATE] Effect: activeTimers changed, updating ref and state",
    );
    activeTimersRef.current = activeTimers;
    setCalculatedTimers(activeTimers);
  }, [activeTimers.length]);

  useEffect(() => {
    console.log("[USE_TIMERS_UPDATE] Effect: Setting up interval");
    const interval = setInterval(() => {
      console.log("[USE_TIMERS_UPDATE] Interval tick - updating timers");
      setCalculatedTimers((prev) => {
        const updated = calculateTimeLeft(prev);
        const filtered = filterTimersByRemovalTime(updated, removeTimerAfterMs);
        console.log("[USE_TIMERS_UPDATE] Interval update:", {
          prevCount: prev.length,
          updatedCount: updated.length,
          filteredCount: filtered.length,
        });
        return filtered;
      });
    }, 1000);
    return () => {
      console.log("[USE_TIMERS_UPDATE] Clearing interval");
      clearInterval(interval);
    };
  }, [removeTimerAfterMs]);

  console.log("[USE_TIMERS_UPDATE] Returning calculatedTimers:", {
    count: calculatedTimers.length,
    ref: calculatedTimers,
  });

  return calculatedTimers;
};
