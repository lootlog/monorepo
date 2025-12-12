import { useState, useEffect } from "react";

export type WindowStatus = "OPEN" | "WAITING" | "NONE";

/**
 * Hook that calculates respawn window status client-side based on spawn times.
 * Schedules timeouts at exact boundary transitions instead of polling.
 *
 * @param minSpawnTime - Earliest expected spawn time (ISO string)
 * @param maxSpawnTime - Latest expected spawn time (ISO string)
 * @returns Current window status: OPEN, WAITING, or NONE
 */
export function useWindowStatus(
  minSpawnTime: string | null,
  maxSpawnTime: string | null,
): WindowStatus {
  const [status, setStatus] = useState<WindowStatus>("NONE");

  useEffect(() => {
    if (!minSpawnTime || !maxSpawnTime) {
      setStatus("NONE");
      return;
    }

    const min = new Date(minSpawnTime).getTime();
    const max = new Date(maxSpawnTime).getTime();

    const recalc = () => {
      const now = Date.now();
      if (now >= max) setStatus("NONE");
      else if (now >= min) setStatus("OPEN");
      else setStatus("WAITING");
    };

    recalc();

    // Schedule updates at boundaries
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    if (now < min) {
      // Schedule transition from WAITING to OPEN
      timeouts.push(setTimeout(recalc, min - now + 100)); // +100ms buffer for clock drift
    }
    if (now < max) {
      // Schedule transition from OPEN to NONE
      timeouts.push(setTimeout(recalc, max - now + 100));
    }

    return () => timeouts.forEach(clearTimeout);
  }, [minSpawnTime, maxSpawnTime]);

  return status;
}
