import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

type RefreshCooldownProps = {
  time: string;
};

export const RefreshCooldown = ({ time }: RefreshCooldownProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Clock className="size-4" aria-hidden />
      <span className="tabular-nums">
        {t("common.cooldown.nextRefreshIn", { time })}
      </span>
    </div>
  );
};
