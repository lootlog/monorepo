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
  renderEpoch = Date.now(),
) => {
  const [refreshVersion, refreshTimers] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const nextBoundary = enabled
    ? getNextTimerRemovalBoundary(timers, removeTimerAfterMs, renderEpoch)
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
  }, [nextBoundary, refreshVersion]);
};
