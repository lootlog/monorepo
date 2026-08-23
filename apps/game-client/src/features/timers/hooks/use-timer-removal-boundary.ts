import type { Timer } from "@/api/timers.api";
import { useEffect, useReducer } from "react";

const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

const getTimerRemovalBoundary = (timer: Timer, removeTimerAfterMs: number) => {
  const expiryTimestamp = timer.deletedAt ?? timer.maxSpawnTime;
  return new Date(expiryTimestamp).getTime() + removeTimerAfterMs;
};

export const getNextTimerRemovalBoundary = (
  timers: Timer[],
  removeTimerAfterMs: number,
  now = Date.now(),
) => {
  let nextBoundary: number | undefined;

  for (const timer of timers) {
    const boundary = getTimerRemovalBoundary(timer, removeTimerAfterMs);
    if (
      boundary > now &&
      (nextBoundary === undefined || boundary < nextBoundary)
    ) {
      nextBoundary = boundary;
    }
  }

  return nextBoundary;
};

export const useTimerRemovalBoundary = (
  timers: Timer[],
  removeTimerAfterMs: number,
  enabled: boolean,
) => {
  const [, refreshTimers] = useReducer((version: number) => version + 1, 0);

  useEffect(() => {
    if (!enabled || timers.length === 0) {
      return;
    }

    const now = Date.now();
    const nextBoundary = getNextTimerRemovalBoundary(
      timers,
      removeTimerAfterMs,
      now,
    );

    if (nextBoundary === undefined) {
      return;
    }

    const timeoutId = window.setTimeout(
      refreshTimers,
      Math.min(nextBoundary - now, MAX_TIMEOUT_DELAY_MS),
    );

    return () => window.clearTimeout(timeoutId);
  }, [enabled, removeTimerAfterMs, timers]);
};
