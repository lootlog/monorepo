import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

const getShownMinutes = (remainingMs: number) =>
  remainingMs > 0 ? Math.ceil(remainingMs / MINUTE_MS) : 0;

export function useReadyRoomMinutesLeft(expiresAt: string): number {
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
