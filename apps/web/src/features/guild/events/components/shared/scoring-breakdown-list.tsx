import { cn } from "cn";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { formatPoints } from "../../utils/format-points";
import type { getScoringItems } from "../../utils/scoring-presentation";

type ScoringBreakdownListProps = {
  items: ReturnType<typeof getScoringItems>;
  totalPoints: number;
};

/** A kill's points broken into base, bonuses and adjustments, with the total. */
export const ScoringBreakdownList = ({
  items,
  totalPoints,
}: ScoringBreakdownListProps) => {
  const { t } = useTranslation();

  return (
    <dl className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 text-xs">
      {items.map((item) => (
        <Fragment key={`${item.label}:${item.value}`}>
          <dt className="truncate text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "text-right font-semibold tabular-nums",
              item.valueClassName,
            )}
          >
            {item.value}
          </dd>
        </Fragment>
      ))}
      <dt className="border-t border-border/60 pt-1.5 font-medium">
        {t("events.kills.pointsTooltip.total")}
      </dt>
      <dd className="border-t border-border/60 pt-1.5 text-right font-bold tabular-nums text-primary">
        {formatPoints(totalPoints)}
      </dd>
    </dl>
  );
};
