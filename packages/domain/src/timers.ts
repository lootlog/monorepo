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
  /** When a Hero Tracker's open entrance closes; its respawn window follows. */
  readonly entranceClosesAt?: string | null;
};

export type TimerTimeLeft = {
  readonly minTimeLeft: number;
  readonly maxTimeLeft: number;
  /** Present only for a timer with a Hero Tracker entrance. */
  readonly entranceTimeLeft?: number;
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

  const timeLeft = {
    maxTimeLeft: toEpoch(timer.maxSpawnTime) - now,
    minTimeLeft: toEpoch(timer.minSpawnTime) - now,
  };

  return timer.entranceClosesAt
    ? {
        ...timeLeft,
        entranceTimeLeft: toEpoch(timer.entranceClosesAt) - now,
      }
    : timeLeft;
};

const isEntranceOpen = ({ entranceTimeLeft }: TimerTimeLeft) =>
  entranceTimeLeft !== undefined && entranceTimeLeft > 0;

/**
 * Where a timer stands: a Hero Tracker's entrance still open, before its spawn
 * window, inside it, past its maximum spawn time, or kept past the removal
 * delay because the player pinned it.
 */
export type TimerPhase =
  | "entrance"
  | "waiting"
  | "window"
  | "overdue"
  | "expired";

export const getTimerPhase = (
  timeLeft: TimerTimeLeft,
  removeTimerAfterMs: number,
): TimerPhase => {
  const { minTimeLeft, maxTimeLeft } = timeLeft;

  if (isEntranceOpen(timeLeft)) return "entrance";

  if (maxTimeLeft <= -removeTimerAfterMs) return "expired";

  if (maxTimeLeft < 0) return "overdue";

  if (minTimeLeft < 0) return "window";

  return "waiting";
};

export type TimerCountdownMode = "min" | "max";

/**
 * The one countdown a timer shows: to an open entrance's close, otherwise to
 * its maximum, or to its minimum until it passes.
 */
export const getTimerCountdownMs = (
  timeLeft: TimerTimeLeft,
  countdownMode: TimerCountdownMode,
) => {
  const { minTimeLeft, maxTimeLeft, entranceTimeLeft } = timeLeft;

  if (entranceTimeLeft !== undefined && isEntranceOpen(timeLeft)) {
    return entranceTimeLeft;
  }

  return countdownMode === "max" || minTimeLeft < 0 ? maxTimeLeft : minTimeLeft;
};

/**
 * A Hero Tracker's window comes from the entrance countdown the game reports,
 * so a reset from the moment someone clicks would only make it wrong.
 */
export const canResetTimerNpc = (npc: { readonly type?: string | null }) =>
  npc.type !== "HERO_TRACKER";

/**
 * What every timer list orders a timer by: the time left to an open entrance's
 * close, otherwise to its maximum spawn time (or its deletion).
 */
export const getTimerSortTimeLeft = (timeLeft: TimerTimeLeft): number =>
  timeLeft.entranceTimeLeft !== undefined && isEntranceOpen(timeLeft)
    ? timeLeft.entranceTimeLeft
    : timeLeft.maxTimeLeft;
