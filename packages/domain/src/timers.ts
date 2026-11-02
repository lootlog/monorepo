/** The respawn variation Margonem applies when an NPC reports none. */
export const DEFAULT_RESPAWN_RANDOMNESS = 10;

/** Shortest respawn base Margonem reports for an NPC that gets a timer. */
export const MIN_RESP_BASE_SECONDS = 2;

/**
 * How a timer stores its respawn, and what a reset counts from the moment of
 * the reset: `respBaseSeconds` ± `respawnRandomness` percent of it. Margonem
 * reports respawns in this form; a window entered by hand or opened by an
 * event is converted with `respawnFromSpawnWindow`.
 */
export type TimerRespawn = {
  readonly respBaseSeconds: number;
  readonly respawnRandomness: number;
};

/** A spawn window as offsets from the moment it starts counting. */
export type SpawnWindowOffsets = {
  readonly minOffsetMs: number;
  readonly maxOffsetMs: number;
};

export const spawnWindowFromRespawn = ({
  respBaseSeconds,
  respawnRandomness,
}: TimerRespawn): SpawnWindowOffsets => {
  const baseMs = respBaseSeconds * 1000;
  const varianceMs = Math.round(baseMs * (respawnRandomness / 100));

  return { minOffsetMs: baseMs - varianceMs, maxOffsetMs: baseMs + varianceMs };
};

/**
 * The respawn whose reset repeats a window that opens `minSeconds` and closes
 * `maxSeconds` from now; a window already open counts from now. Both values
 * are stored as integers, so a reset can differ from the original window by
 * a second plus half a percent of the base.
 *
 * Rows written before this encoding keep their values: their reset is still
 * base ± randomness, as before, so no migration rewrites them.
 */
export const respawnFromSpawnWindow = (
  minSeconds: number,
  maxSeconds: number,
): TimerRespawn => {
  const min = Math.max(minSeconds, 0);
  const max = Math.max(maxSeconds, min);
  const respBaseSeconds = Math.round((min + max) / 2);

  return {
    respBaseSeconds,
    respawnRandomness:
      respBaseSeconds > 0
        ? Math.round(((max - min) / 2 / respBaseSeconds) * 100)
        : 0,
  };
};

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

// Margonem sends the seconds left on a Hero Tracker's entrance, so closing
// times of one entrance differ only by latency (and by the reporter's clock
// for clients that still send their own close time), never by minutes.
const SAME_HERO_TRACKER_ENTRANCE_TOLERANCE_MS = 60_000;

/** Whether two closing times, in epoch ms, belong to one Hero Tracker entrance. */
export const isSameHeroTrackerEntrance = (
  closesAtMs: number,
  otherClosesAtMs: number,
): boolean =>
  Math.abs(closesAtMs - otherClosesAtMs) <
  SAME_HERO_TRACKER_ENTRANCE_TOLERANCE_MS;
