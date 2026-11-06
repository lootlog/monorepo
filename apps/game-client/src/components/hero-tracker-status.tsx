import type { FC } from "react";
import { useTranslation } from "react-i18next";
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
    return (
      <span className="ll:shrink-0 ll:font-semibold ll:text-primary">
        {t("heroTracker.unclaimed")}
      </span>
    );
  }

  const remainingMs = entranceClosesAt - now;

  if (remainingMs <= 0) {
    return (
      <span className="ll:shrink-0 ll:text-gray-400">
        {t("heroTracker.closed")}
      </span>
    );
  }

  return (
    <span className="ll:shrink-0 ll:font-semibold ll:text-emerald-300 ll:tabular-nums">
      {t("heroTracker.open", { time: parseMsToTime(remainingMs) })}
    </span>
  );
};
