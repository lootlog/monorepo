import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

type RefreshCooldownProps = {
  /** Remaining time as `m:ss`, from `useCountdown`. */
  time: string;
};

/** Stands in for a refresh action while the server keeps it on cooldown. */
export const RefreshCooldown = ({ time }: RefreshCooldownProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Clock className="size-4" />
      <span className="tabular-nums">
        {t("common.cooldown.nextRefreshIn", { time })}
      </span>
    </div>
  );
};
