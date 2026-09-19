import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { formatPoints } from "../../utils/format-points";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";

type MemberKillBreakdownRowProps = {
  columnCount: number;
  kill: EventMemberKill;
};

export const MemberKillBreakdownRow = ({
  columnCount,
  kill,
}: MemberKillBreakdownRowProps) => {
  const { t } = useTranslation();

  const { point, hasManualPointsAdjustment, scoringItems } =
    getMemberKillScoringViewModel(kill, t);

  return (
    <TableRow data-state="expanded-detail">
      <TableCell
        colSpan={columnCount}
        className="h-auto whitespace-normal px-4 py-3"
      >
        {point ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
            <div className="min-w-0">
              <div className="mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("events.kills.scoringBreakdown")}
                </p>
                {(kill.isManualClose || hasManualPointsAdjustment) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {kill.isManualClose && (
                      <span className="text-[10px] font-medium text-amber-400">
                        {t("events.kills.manualClose")}
                      </span>
                    )}
                    {hasManualPointsAdjustment && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
                        <Info className="size-3" />
                        {t("events.points.modified")}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <dl className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 text-xs">
                {scoringItems.map((item) => (
                  <Fragment key={`${item.label}:${item.value}`}>
                    <dt className="truncate text-muted-foreground">
                      {item.label}
                    </dt>
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
              </dl>
            </div>
            <div className="flex items-end justify-between border-t border-border/70 pt-3 sm:min-w-28 sm:flex-col sm:items-center sm:justify-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("events.kills.pointsTooltip.total")}
              </span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formatPoints(point.points)}
                <span className="ml-1 text-xs font-medium text-primary/75">
                  {t("events.common.pointsShort", "pkt")}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("events.kills.pointBreakdownUnavailable")}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
};
