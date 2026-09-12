import type { Timer } from "@/api/timers.api";
import { parseMsToTime } from "@lootlog/datetime";
import { useTimerClockEpoch } from "@/features/timers/components/shared/timer-clock-provider";
import {
  calculateTimeLeft,
  getTimerTimeLeft,
} from "@/features/timers/model/timer-time";

export type TimerCountdownPhase = "active" | "afterMin" | "expired";

/**
 * The countdown label of one tile, re-evaluated on every shared clock tick.
 * Call it in the leaf that renders the text so a tick updates only that node.
 */
export const useTimerCountdown = (
  timer: Timer,
  countdownMode: "min" | "max",
) => {
  const epoch = useTimerClockEpoch();
  const { maxTimeLeft, minTimeLeft } = getTimerTimeLeft(timer, epoch);
  const isMinSpawnTime = minTimeLeft < 0;
  const hasExpired = maxTimeLeft < 0;

  const timeLeft = calculateTimeLeft(
    minTimeLeft,
    maxTimeLeft,
    countdownMode,
    isMinSpawnTime,
  );

  const phase: TimerCountdownPhase = hasExpired
    ? "expired"
    : isMinSpawnTime
      ? "afterMin"
      : "active";

  return { timeLabel: parseMsToTime(timeLeft), phase };
};
