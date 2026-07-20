import { useEffect, useState } from "react";

export const NPC_DETECTOR_CLOCK_INTERVAL_MS = 250;
const subscribers = new Set<(currentTimeMs: number) => void>();
let clockIntervalId: number | null = null;

const stopClockIfIdle = () => {
  if (subscribers.size > 0 || clockIntervalId === null) {
    return;
  }

  window.clearInterval(clockIntervalId);
  clockIntervalId = null;
};

const startClock = () => {
  if (clockIntervalId !== null) {
    return;
  }

  clockIntervalId = window.setInterval(() => {
    const currentTimeMs = Date.now();
    subscribers.forEach((subscriber) => subscriber(currentTimeMs));
  }, NPC_DETECTOR_CLOCK_INTERVAL_MS);
};

const subscribeToNpcDetectorClock = (
  subscriber: (currentTimeMs: number) => void,
) => {
  subscribers.add(subscriber);
  subscriber(Date.now());
  startClock();

  return () => {
    subscribers.delete(subscriber);
    stopClockIfIdle();
  };
};

export const useNpcDetectorClock = (enabled: boolean) => {
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToNpcDetectorClock(setCurrentTimeMs);
  }, [enabled]);

  return currentTimeMs;
};
