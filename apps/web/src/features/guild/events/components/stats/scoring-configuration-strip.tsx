import type { TFunction } from "i18next";

interface ScoringConfigurationStripProps {
  hardCapPoints: number;
  minTrackingPercentForBonuses: number;
  timezone: string;
  t: TFunction;
}

export const ScoringConfigurationStrip = ({
  hardCapPoints,
  minTrackingPercentForBonuses,
  timezone,
  t,
}: ScoringConfigurationStripProps) => (
  <dl className="grid grid-cols-2 divide-x divide-y divide-border/70 border-b border-border/70 bg-muted/15 text-xs sm:grid-cols-3 sm:divide-y-0">
    <div className="min-w-0 px-3 py-2.5">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {t("events.killDetail.multipliers.capLabel")}
      </dt>
      <dd className="mt-1 break-words font-medium text-foreground">
        {t("events.killDetail.multipliers.pointsValue", {
          points: hardCapPoints.toFixed(2),
        })}
      </dd>
    </div>
    <div className="min-w-0 px-3 py-2.5">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {t("events.scoring.minTrackingPercentForBonuses")}
      </dt>
      <dd className="mt-1 break-words font-medium text-foreground">
        {minTrackingPercentForBonuses}%
      </dd>
    </div>
    <div className="col-span-2 min-w-0 px-3 py-2.5 sm:col-span-1">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {t("events.scoring.timezoneLabel")}
      </dt>
      <dd className="mt-1 break-words font-medium text-foreground">
        {timezone}
      </dd>
    </div>
  </dl>
);
