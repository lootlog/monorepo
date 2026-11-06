import { useEffect, useState } from "react";

type ClockListener = (epoch: number) => void;

type Clock = {
  listeners: Set<ClockListener>;
  interval: ReturnType<typeof setInterval> | null;
  syncVisibility: () => void;
};

/** One interval per period, shared by every caller of that period. */
const clocks = new Map<number, Clock>();

const publish = (clock: Clock) => {
  const epoch = Date.now();

  for (const listener of clock.listeners) listener(epoch);
};

const stop = (clock: Clock) => {
  if (clock.interval === null) return;

  clearInterval(clock.interval);
  clock.interval = null;
};

const createClock = (periodMs: number): Clock => {
  const clock: Clock = {
    listeners: new Set(),
    interval: null,
    // A hidden document draws nothing, so its clock stops and catches up
    // once shown again.
    syncVisibility: () => {
      if (document.hidden) {
        stop(clock);

        return;
      }

      publish(clock);
      clock.interval ??= setInterval(() => publish(clock), periodMs);
    },
  };

  return clock;
};

const subscribe = (periodMs: number, listener: ClockListener) => {
  let clock = clocks.get(periodMs);

  if (!clock) {
    clock = createClock(periodMs);
    clocks.set(periodMs, clock);
  }

  const subscribed = clock;
  subscribed.listeners.add(listener);
  listener(Date.now());

  if (subscribed.listeners.size === 1) {
    document.addEventListener("visibilitychange", subscribed.syncVisibility);
    subscribed.syncVisibility();
  }

  return () => {
    subscribed.listeners.delete(listener);

    if (subscribed.listeners.size > 0) return;

    document.removeEventListener("visibilitychange", subscribed.syncVisibility);
    stop(subscribed);
    clocks.delete(periodMs);
  };
};

/**
 * The current epoch time, refreshed every `periodMs` while `enabled` and the
 * document is visible. Callers of one period share one interval and tick in
 * the same task, so they render together. Pick the coarsest period the shown
 * time needs: every tick re-renders the caller.
 */
export const useNow = (periodMs: number, enabled = true): number => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;

    return subscribe(periodMs, setNow);
  }, [periodMs, enabled]);

  return now;
};
