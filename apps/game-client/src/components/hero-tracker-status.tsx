import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { DoorClosed, DoorOpen } from "lucide-react";
import { parseMsToTime } from "@lootlog/datetime";
import { useNow } from "@/hooks/ui/use-now";

type HeroTrackerStatusProps = {
  /** Epoch ms when the entrance closes; absent while nobody claimed it. */
  entranceClosesAt: number | undefined;
};

/** Whether a Hero Tracker waits to be claimed or how long its entrance stays open. */
export const HeroTrackerStatus: FC<HeroTrackerStatusProps> = ({
  entranceClosesAt,
}) => {
  const { t } = useTranslation("common");
  const now = useNow(1_000, entranceClosesAt !== undefined);

  if (entranceClosesAt === undefined) {
    const label = t("heroTracker.unclaimed");

    return (
      <span
        title={label}
        className="ll:shrink-0 ll:font-semibold ll:text-primary"
      >
        <span aria-hidden="true">{t("heroTracker.unclaimedShort")}</span>
        <span className="ll:sr-only">{label}</span>
      </span>
    );
  }

  const remainingMs = entranceClosesAt - now;

  if (remainingMs <= 0) {
    const label = t("heroTracker.closed");

    return (
      <span
        title={label}
        className="ll:flex ll:shrink-0 ll:items-center ll:gap-0.5 ll:text-gray-400"
      >
        <DoorClosed size={12} aria-hidden="true" />
        <span className="ll:sr-only">{label}</span>
      </span>
    );
  }

  // Entrances stay open for minutes, so the hour field is noise in a tight row.
  const time = parseMsToTime(remainingMs).replace(/^00:/, "");
  const label = t("heroTracker.open", { time });

  return (
    <span
      title={label}
      className="ll:flex ll:shrink-0 ll:items-center ll:gap-0.5 ll:font-semibold ll:text-emerald-300 ll:tabular-nums"
    >
      <DoorOpen size={12} aria-hidden="true" />
      <span aria-hidden="true">{time}</span>
      <span className="ll:sr-only">{label}</span>
    </span>
  );
};
