import { Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type RefreshCooldownProps = {
  /** Remaining time as `m:ss`, from `useCountdown`. */
  time: string;
};

/** Stands in for a refresh action while the server keeps it on cooldown. */
export const RefreshCooldown = ({ time }: RefreshCooldownProps) => {
  const { t } = useTranslation();

  // Announce the cooldown once when it starts; the ticking time stays out of
  // the live region so screen readers are not interrupted every second.
  const [announcement] = useState(() => t("common.cooldown.started", { time }));

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <Clock className="size-4" aria-hidden />
      <span className="tabular-nums">
        {t("common.cooldown.nextRefreshIn", { time })}
      </span>
    </div>
  );
};
