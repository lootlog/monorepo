export type TimerIdentity = {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
};

export const isSameTimer = (
  first: TimerIdentity,
  second: TimerIdentity,
): boolean =>
  first.timerKey === second.timerKey &&
  first.guildId === second.guildId &&
  first.world === second.world;

export const upsertTimerInCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: Timer,
): Timer[] | undefined => {
  if (timers === undefined) return undefined;

  const updated = [...timers];
  const index = updated.findIndex((entry) => isSameTimer(entry, timer));

  if (index === -1) {
    updated.push(timer);
  } else {
    updated[index] = timer;
  }

  return updated;
};

export const removeTimerFromCollection = <Timer extends TimerIdentity>(
  timers: Timer[] | undefined,
  timer: TimerIdentity,
): Timer[] | undefined => timers?.filter((entry) => !isSameTimer(entry, timer));

export type TimerSpawnTimes = {
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly deletedAt?: string | null;
};

export type TimerTimeLeft = {
  readonly minTimeLeft: number;
  readonly maxTimeLeft: number;
};

/**
 * Milliseconds left to the minimum and maximum spawn time; a deleted timer
 * counts both down to its deletion. `toEpoch` lets callers cache parsing.
 */
export const getTimerTimeLeft = (
  timer: TimerSpawnTimes,
  now: number,
  toEpoch: (timestamp: string) => number = Date.parse,
): TimerTimeLeft => {
  if (timer.deletedAt) {
    const deletedTimeLeft = toEpoch(timer.deletedAt) - now;

    return { maxTimeLeft: deletedTimeLeft, minTimeLeft: deletedTimeLeft };
  }

  return {
    maxTimeLeft: toEpoch(timer.maxSpawnTime) - now,
    minTimeLeft: toEpoch(timer.minSpawnTime) - now,
  };
};

/**
 * Where a timer stands: before its spawn window, inside it, past its maximum
 * spawn time, or kept past the removal delay because the player pinned it.
 */
export type TimerPhase = "waiting" | "window" | "overdue" | "expired";

export const getTimerPhase = (
  { minTimeLeft, maxTimeLeft }: TimerTimeLeft,
  removeTimerAfterMs: number,
): TimerPhase => {
  if (maxTimeLeft <= -removeTimerAfterMs) return "expired";

  if (maxTimeLeft < 0) return "overdue";

  if (minTimeLeft < 0) return "window";

  return "waiting";
};

export type TimerCountdownMode = "min" | "max";

/** The one countdown a timer shows: to its maximum, or to its minimum until it passes. */
export const getTimerCountdownMs = (
  { minTimeLeft, maxTimeLeft }: TimerTimeLeft,
  countdownMode: TimerCountdownMode,
) => (countdownMode === "max" || minTimeLeft < 0 ? maxTimeLeft : minTimeLeft);
