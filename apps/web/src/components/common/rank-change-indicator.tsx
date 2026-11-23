import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

export function RankChangeIndicator({ places }: { places: number }) {
  const { t } = useTranslation();
  const Icon = places > 0 ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex animate-pop-in motion-reduce:animate-none",
        places > 0 ? "text-signal-ready" : "text-signal-alert",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="sr-only">
        {places > 0
          ? t("common.leaderboard.rankUp", { count: places })
          : t("common.leaderboard.rankDown", { count: -places })}
      </span>
    </span>
  );
}
