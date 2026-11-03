import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `periodMs` while the component is
 * mounted. Pick the coarsest period the shown time needs: every tick
 * re-renders the caller.
 */
export const useNow = (periodMs: number): number => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), periodMs);

    return () => window.clearInterval(interval);
  }, [periodMs]);

  return now;
};
