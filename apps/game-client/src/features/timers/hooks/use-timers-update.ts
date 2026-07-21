import { useEffect, useState } from "react";

export const useTimersUpdate = (enabled = true) => {
  const [clockEpoch, setClockEpoch] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;

    const updateClock = () => {
      setClockEpoch(Date.now());
    };

    updateClock();
    const interval = setInterval(() => {
      updateClock();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  return clockEpoch;
};
