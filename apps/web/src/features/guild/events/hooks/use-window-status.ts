import { useState, useEffect } from "react";

export type WindowStatus = "OPEN" | "WAITING" | "OVERDUE" | "NONE";

export function isWindowActive(status: WindowStatus): boolean {
  return status === "OPEN" || status === "OVERDUE";
}

const scheduleStatusRecalculation = (
  recalculate: () => void,
  delay: number,
) => {
  if (delay <= 0) return () => undefined;

  const timeoutId = setTimeout(recalculate, delay);
  return () => clearTimeout(timeoutId);
};

export function useWindowStatus(
  minSpawnTime: string | null,
  maxSpawnTime: string | null,
): WindowStatus {
  const [status, setStatus] = useState<WindowStatus>("NONE");

  useEffect(() => {
    if (!minSpawnTime || !maxSpawnTime) {
      setStatus("NONE");
      return () => undefined;
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

    const now = Date.now();
    const cancelMinRecalculation = scheduleStatusRecalculation(
      recalc,
      now < min ? min - now + 100 : 0,
    );
    const cancelMaxRecalculation = scheduleStatusRecalculation(
      recalc,
      now < max ? max - now + 100 : 0,
    );

    return () => {
      cancelMinRecalculation();
      cancelMaxRecalculation();
    };
  }, [minSpawnTime, maxSpawnTime]);

  return status;
}
