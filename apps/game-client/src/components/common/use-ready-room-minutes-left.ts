import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/** The number shown: whole minutes left, rounded up; 0 once it lapsed. */
const getShownMinutes = (remainingMs: number) =>
  remainingMs > 0 ? Math.ceil(remainingMs / MINUTE_MS) : 0;

/**
 * Whole minutes left before a gathering lapses, rounded up. Re-renders only
 * when the shown minute changes, not every second.
 */
export function useReadyRoomMinutesLeft(expiresAt: string): number {
  // A fresh sample per fire: a coarse clock may repeat the last value, and
  // React would skip the identical update and leave no timer armed.
  const [clock, setClock] = useState(() => ({ now: Date.now() }));
  const expiresAtMs = Date.parse(expiresAt);
  const shownMinutes = getShownMinutes(expiresAtMs - clock.now);

  useEffect(() => {
    const currentMs = expiresAtMs - Date.now();

    const delay =
      getShownMinutes(currentMs) !== shownMinutes
        ? 0
        : shownMinutes > 0
          ? currentMs - (shownMinutes - 1) * MINUTE_MS
          : null;

    if (delay === null) return;

    const timeout = window.setTimeout(
      () => setClock({ now: Date.now() }),
      delay,
    );

    return () => window.clearTimeout(timeout);
  }, [clock, expiresAtMs, shownMinutes]);

  return shownMinutes;
}
