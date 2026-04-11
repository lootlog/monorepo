import { useState, useEffect } from "react";

export type WindowStatus = "OPEN" | "WAITING" | "OVERDUE" | "NONE";

export function isWindowActive(status: WindowStatus): boolean {
  return status === "OPEN" || status === "OVERDUE";
}

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
      if (now >= max) setStatus("OVERDUE");
      else if (now >= min) setStatus("OPEN");
      else setStatus("WAITING");
    };

    recalc();

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    if (now < min) {
      timeouts.push(setTimeout(recalc, min - now + 100));
    }
    if (now < max) {
      timeouts.push(setTimeout(recalc, max - now + 100));
    }

    return () => timeouts.forEach(clearTimeout);
  }, [minSpawnTime, maxSpawnTime]);

  return status;
}
