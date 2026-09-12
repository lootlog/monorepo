import type { CSSProperties } from "react";
import type { Timer } from "@/api/timers.api";
import { getTimerEpoch } from "./timer-time";

const MIN_TOTAL_MS = 1_000;

/**
 * Inline style of a tile's progress line: one CSS animation from the moment
 * the timer was set to its maximum spawn time. A negative delay starts the
 * animation at the elapsed fraction, so the browser draws every following
 * frame itself and React never writes per-second styles.
 */
export const getTimerProgressStyle = (
  timer: Pick<Timer, "updatedAt" | "minSpawnTime" | "maxSpawnTime">,
  now: number,
): CSSProperties | undefined => {
  const end = getTimerEpoch(timer.maxSpawnTime);

  const start = timer.updatedAt
    ? getTimerEpoch(timer.updatedAt)
    : getTimerEpoch(timer.minSpawnTime);

  const total = end - start;

  if (!Number.isFinite(total) || total < MIN_TOTAL_MS || now >= end) {
    return undefined;
  }

  const elapsed = Math.max(0, now - start);

  return {
    animationName: "ll-timer-progress",
    animationDuration: `${total}ms`,
    animationDelay: `-${elapsed}ms`,
    animationTimingFunction: "linear",
    animationFillMode: "forwards",
  };
};
