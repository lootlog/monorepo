import { useEffect, useState } from "react";
import { setMeasuredInterval } from "@/lib/performance-monitoring/measured-callback";

export const useTimersUpdate = (enabled = true) => {
  const [clockEpoch, setClockEpoch] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;

    const updateClock = () => {
      setClockEpoch(Date.now());
    };

    updateClock();
    const interval = setMeasuredInterval("timers.clock", updateClock, 1_000);
    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  return clockEpoch;
};
