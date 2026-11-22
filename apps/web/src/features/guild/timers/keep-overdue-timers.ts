import {
  getTimerTimeLeft,
  isSameTimer,
  isTimerListed,
  type TimerIdentity,
  type TimerSpawnTimes,
} from "@lootlog/domain/timers";

export const keepOverdueTimers = <
  Timer extends TimerIdentity & TimerSpawnTimes,
>(
  fresh: Timer[],
  previous: readonly Timer[] | undefined,
  removeTimerAfterMs: number,
  now: number,
): Timer[] => {
  const overdue = (previous ?? []).filter(
    (timer) =>
      getTimerTimeLeft(timer, now).maxTimeLeft < 0 &&
      isTimerListed(timer, removeTimerAfterMs, now) &&
      !fresh.some((entry) => isSameTimer(entry, timer)),
  );

  return overdue.length > 0 ? [...fresh, ...overdue] : fresh;
};
