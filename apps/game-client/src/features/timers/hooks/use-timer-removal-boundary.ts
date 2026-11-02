import type { Timer } from "@/api/timers.api";
import { getTimerEpoch } from "@/features/timers/utils/timers-utils";
import { useEffect, useReducer } from "react";

const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

/**
 * The moments the list must be projected again: a timer leaves it once its
 * removal delay passes, and a Hero Tracker sorts by its entrance only while
 * the entrance is open.
 */
const getTimerListBoundaries = (timer: Timer, removeTimerAfterMs: number) => {
  const removal =
    getTimerEpoch(timer.deletedAt ?? timer.maxSpawnTime) + removeTimerAfterMs;

  return timer.entranceClosesAt && !timer.deletedAt
    ? [removal, getTimerEpoch(timer.entranceClosesAt)]
    : [removal];
};

export const getNextTimerRemovalBoundary = (
  timers: Timer[],
  removeTimerAfterMs: number,
  now = Date.now(),
) => {
  let nextBoundary: number | undefined;

  for (const timer of timers) {
    for (const boundary of getTimerListBoundaries(timer, removeTimerAfterMs)) {
      if (
        boundary > now &&
        (nextBoundary === undefined || boundary < nextBoundary)
      ) {
        nextBoundary = boundary;
      }
    }
  }

  return nextBoundary;
};

export const useTimerRemovalBoundary = (
  timers: Timer[],
  removeTimerAfterMs: number,
  enabled: boolean,
) => {
  const [timerCalculationEpoch, refreshTimers] = useReducer(
    () => Date.now(),
    undefined,
    Date.now,
  );

  const nextBoundary = enabled
    ? getNextTimerRemovalBoundary(
        timers,
        removeTimerAfterMs,
        timerCalculationEpoch,
      )
    : undefined;

  useEffect(() => {
    if (nextBoundary === undefined) {
      return;
    }

    const timeoutId = window.setTimeout(
      refreshTimers,
      Math.min(Math.max(nextBoundary - Date.now(), 0), MAX_TIMEOUT_DELAY_MS),
    );

    return () => window.clearTimeout(timeoutId);
  }, [nextBoundary, timerCalculationEpoch]);

  return timerCalculationEpoch;
};
