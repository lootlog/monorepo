import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const MINUTE_MS = 60_000;

/** The number shown: whole minutes left, rounded up; 0 once it lapsed. */
const getShownMinutes = (remainingMs: number) =>
  remainingMs > 0 ? Math.ceil(remainingMs / MINUTE_MS) : 0;

type ReadyRoomExpiryProps = {
  expiresAt: string;
};

/** Whole minutes left before the gathering lapses, rounded up. */
export function ReadyRoomExpiry({ expiresAt }: ReadyRoomExpiryProps) {
  const { t } = useTranslation("partyFinder");
  const [now, setNow] = useState(Date.now);
  const expiresAtMs = Date.parse(expiresAt);
  const remainingMs = expiresAtMs - now;
  const shownMinutes = getShownMinutes(remainingMs);

  // Re-render only when the shown minute changes, not every second.
  useEffect(() => {
    const currentMs = expiresAtMs - Date.now();

    const delay =
      getShownMinutes(currentMs) !== shownMinutes
        ? 0
        : shownMinutes > 0
          ? currentMs - (shownMinutes - 1) * MINUTE_MS
          : null;

    if (delay === null) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), delay);

    return () => window.clearTimeout(timeout);
  }, [expiresAtMs, now, shownMinutes]);

  return (
    <span className="ll:shrink-0 ll:tabular-nums ll:text-muted-foreground">
      {remainingMs > 0
        ? t("header.expiresIn", { minutes: shownMinutes })
        : t("header.expiring")}
    </span>
  );
}
