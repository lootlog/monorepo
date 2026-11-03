import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/**
 * The current time, refreshed every minute: relative ages and staleness
 * shown in whole minutes need nothing finer, so one timer serves the list.
 */
export const useMinuteClock = (): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), MINUTE_MS);

    return () => window.clearInterval(interval);
  }, []);

  return now;
};
