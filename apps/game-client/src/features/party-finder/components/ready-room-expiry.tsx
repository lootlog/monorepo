import { useTranslation } from "react-i18next";
import { useTimersUpdate } from "@/features/timers/hooks/use-timers-update";

const MINUTE_MS = 60_000;

type ReadyRoomExpiryProps = {
  expiresAt: string;
};

/** Whole minutes left before the gathering lapses, rounded up. */
export function ReadyRoomExpiry({ expiresAt }: ReadyRoomExpiryProps) {
  const { t } = useTranslation("partyFinder");
  const now = useTimersUpdate();
  const remainingMs = Date.parse(expiresAt) - now;

  return (
    <span className="ll:shrink-0 ll:tabular-nums ll:text-white/65">
      {remainingMs > 0
        ? t("header.expiresIn", {
            minutes: Math.ceil(remainingMs / MINUTE_MS),
          })
        : t("header.expiring")}
    </span>
  );
}
