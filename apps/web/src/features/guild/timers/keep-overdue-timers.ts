import {
  getTimerTimeLeft,
  isSameTimer,
  type TimerIdentity,
  type TimerSpawnTimes,
} from "@lootlog/domain/timers";

/**
 * The server lists a timer only until its maximum spawn time unless the player
 * pinned it, while the game client shows it for the removal delay after that.
 * A refetch inside that delay keeps the overdue timers the list already had;
 * one removed live in the meantime is already gone from `previous`.
 */
export const keepOverdueTimers = <
  Timer extends TimerIdentity & TimerSpawnTimes,
>(
  fresh: Timer[],
  previous: readonly Timer[] | undefined,
  removeTimerAfterMs: number,
  now: number,
): Timer[] => {
  const overdue = (previous ?? []).filter((timer) => {
    const { maxTimeLeft } = getTimerTimeLeft(timer, now);

    return (
      maxTimeLeft < 0 &&
      maxTimeLeft > -removeTimerAfterMs &&
      !fresh.some((entry) => isSameTimer(entry, timer))
    );
  });

  return overdue.length > 0 ? [...fresh, ...overdue] : fresh;
};
