import { useEffect, useState } from "react";
import { setMeasuredInterval } from "@/lib/performance-monitoring/measured-callback";

export const useEventModeClock = (enabled: boolean) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = setMeasuredInterval(
      "event-mode.clock",
      () => {
        setNowMs(Date.now());
      },
      1_000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return nowMs;
};
