import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { formatPoints } from "../../utils/format-points";

interface ScoringHowItWorksProps {
  hardCapPoints: number;
  minTrackingPercentForBonuses: number;
}

/** How the rule list resolves into points, shown above the rules. */
export const ScoringHowItWorks = ({
  hardCapPoints,
  minTrackingPercentForBonuses,
}: ScoringHowItWorksProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 rounded-lg bg-muted/40 p-3 text-sm">
      <Info
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="grid gap-1">
        <p className="font-medium">{t("events.scoring.howItWorks.title")}</p>
        <ul className="grid list-disc gap-0.5 pl-4 text-muted-foreground">
          <li>{t("events.scoring.howItWorks.order")}</li>
          <li>{t("events.scoring.howItWorks.base")}</li>
          <li>
            {t("events.scoring.howItWorks.bonus", {
              percentage: Number.isFinite(minTrackingPercentForBonuses)
                ? minTrackingPercentForBonuses
                : 0,
              cap: Number.isFinite(hardCapPoints)
                ? formatPoints(hardCapPoints)
                : "–",
            })}
          </li>
        </ul>
      </div>
    </div>
  );
};
