import { useSyncExternalStore } from "react";

export type WindowStatus = "OPEN" | "WAITING" | "OVERDUE" | "NONE";

export function isWindowActive(status: WindowStatus): boolean {
  return status === "OPEN" || status === "OVERDUE";
}

const subscribeToBoundaries =
  (boundaries: readonly number[]) => (onChange: () => void) => {
    const now = Date.now();

    const timeoutIds = boundaries.flatMap((boundary) =>
      now < boundary ? [setTimeout(onChange, boundary - now + 100)] : [],
    );

    return () => timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
  };

const subscribeToNothing = () => () => undefined;

export function useWindowStatus(
  minSpawnTime: string | null,
  maxSpawnTime: string | null,
): WindowStatus {
  const min = minSpawnTime ? new Date(minSpawnTime).getTime() : null;
  const max = maxSpawnTime ? new Date(maxSpawnTime).getTime() : null;
  const hasWindow = min !== null && max !== null;

  return useSyncExternalStore(
    hasWindow ? subscribeToBoundaries([min, max]) : subscribeToNothing,
    () => {
      if (!hasWindow) return "NONE";

      const now = Date.now();

      if (now >= max) return "OVERDUE";

      if (now >= min) return "OPEN";

      return "WAITING";
    },
  );
}
