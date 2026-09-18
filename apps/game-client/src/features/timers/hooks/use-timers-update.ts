import { useEffect, useState } from "react";

type TimerClockListener = (epoch: number) => void;

const timerClockListeners = new Set<TimerClockListener>();

let timerClockInterval: ReturnType<typeof setInterval> | null = null;

function stopTimerClock(): void {
  if (timerClockInterval === null) return;

  clearInterval(timerClockInterval);
  timerClockInterval = null;
}

function publishTimerClock(): void {
  const epoch = Date.now();

  for (const listener of timerClockListeners) {
    listener(epoch);
  }
}

function syncTimerClockVisibility(): void {
  if (document.hidden) {
    stopTimerClock();

    return;
  }

  publishTimerClock();

  if (timerClockInterval === null) {
    timerClockInterval = setInterval(publishTimerClock, 1000);
  }
}

function subscribeTimerClock(listener: TimerClockListener): () => void {
  timerClockListeners.add(listener);
  listener(Date.now());

  if (timerClockListeners.size === 1) {
    document.addEventListener("visibilitychange", syncTimerClockVisibility);
    syncTimerClockVisibility();
  }

  return () => {
    timerClockListeners.delete(listener);

    if (timerClockListeners.size > 0) return;

    document.removeEventListener("visibilitychange", syncTimerClockVisibility);
    stopTimerClock();
  };
}

export const useTimersUpdate = (enabled = true) => {
  const [clockEpoch, setClockEpoch] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;

    return subscribeTimerClock(setClockEpoch);
  }, [enabled]);

  return clockEpoch;
};
