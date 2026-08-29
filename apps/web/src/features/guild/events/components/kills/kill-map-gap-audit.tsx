import { useState } from "react";
import type { TFunction } from "i18next";
import { ChevronDown } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { formatTimeShort } from "../../utils/format-date";
import { formatDurationHuman } from "../../utils/format-duration";
import type { NormalizedMapGap } from "../../utils/kill-map-timeline-data";

interface KillMapGapAuditProps {
  gaps: NormalizedMapGap[];
  t: TFunction;
}

export const KillMapGapAudit = ({ gaps, t }: KillMapGapAuditProps) => {
  const [showAll, setShowAll] = useState(false);
  const longestGaps = [...gaps]
    .sort((first, second) => {
      const durationDifference = second.durationSeconds - first.durationSeconds;
      if (durationDifference !== 0) return durationDifference;

      const startDifference = first.startedAt.localeCompare(second.startedAt);
      return startDifference !== 0
        ? startDifference
        : first.id.localeCompare(second.id);
    })
    .slice(0, 3);
  const auditGaps = [...gaps].sort((first, second) => {
    const startDifference = first.startedAt.localeCompare(second.startedAt);
    return startDifference !== 0
      ? startDifference
      : first.id.localeCompare(second.id);
  });
  const displayedGaps = showAll ? auditGaps : longestGaps;
  const list = (
    <div className="divide-y divide-border/50">
      {displayedGaps.map((gap) => {
        const typeLabel =
          gap.gapType === "UNASSIGNED"
            ? t("events.killDetail.mapCoverage.unassigned")
            : t("events.killDetail.mapCoverage.uncovered");

        return (
          <div
            key={gap.id}
            className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  gap.gapType === "UNASSIGNED"
                    ? "bg-destructive"
                    : "bg-amber-500",
                )}
              />
              <span className="truncate text-xs font-medium">{typeLabel}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums">
              {formatDurationHuman(gap.durationSeconds)}
            </span>
            <span className="col-span-2 ml-4 text-[10px] tabular-nums text-muted-foreground">
              {formatTimeShort(new Date(gap.startedAt))} –{" "}
              {formatTimeShort(new Date(gap.endedAt))}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t(
            showAll
              ? "events.killDetail.mapCoverage.allGaps"
              : "events.killDetail.mapCoverage.longestGaps",
          )}
        </p>
        {gaps.length > 3 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 px-2 text-xs md:h-8"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
          >
            {t(
              showAll
                ? "events.killDetail.mapCoverage.hideAllGaps"
                : "events.killDetail.mapCoverage.showAllGaps",
              { count: gaps.length },
            )}
            <ChevronDown
              className={cn(
                "ml-1 size-3.5 transition-transform",
                showAll && "rotate-180",
              )}
            />
          </Button>
        ) : null}
      </div>
      {showAll ? <ScrollArea className="h-60 pr-2">{list}</ScrollArea> : list}
    </div>
  );
};
