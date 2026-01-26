import { Card } from "@lootlog/ui/components/card";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import {
  formatDuration as formatGapDuration,
  type CoverageGap,
} from "../../hooks/queries/use-map-coverage-timer";
import type { TFunction } from "i18next";

interface CoverageGapsCardProps {
  gaps: CoverageGap[];
  t: TFunction;
}

export const CoverageGapsCard = ({ gaps, t }: CoverageGapsCardProps) => {
  const closedGaps = gaps.filter((g) => g.durationSeconds !== null);

  const unassignedGaps = closedGaps.filter((g) => g.gapType === "UNASSIGNED");
  const uncoveredGaps = closedGaps.filter((g) => g.gapType === "UNCOVERED");

  const totalUnassignedSeconds = unassignedGaps.reduce(
    (sum, g) => sum + (g.durationSeconds ?? 0),
    0,
  );
  const totalUncoveredSeconds = uncoveredGaps.reduce(
    (sum, g) => sum + (g.durationSeconds ?? 0),
    0,
  );

  if (closedGaps.length === 0) {
    return null;
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {t("events.killDetail.coverageGaps.title", "Okresy nieobstawienia")}
      </h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t(
                "events.killDetail.coverageGaps.unassigned",
                "Brak przypisania",
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-destructive">
                {formatGapDuration(totalUnassignedSeconds)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({unassignedGaps.length}x)
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-xs text-muted-foreground mb-0.5">
              {t("events.killDetail.coverageGaps.uncovered", "Brak obecności")}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-yellow-500">
                {formatGapDuration(totalUncoveredSeconds)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({uncoveredGaps.length}x)
              </span>
            </div>
          </div>
        </div>

        {closedGaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("events.killDetail.coverageGaps.details", "Szczegóły")}
            </h4>
            <div className="space-y-1">
              {closedGaps.slice(0, 10).map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        gap.gapType === "UNASSIGNED"
                          ? "bg-destructive"
                          : "bg-yellow-500",
                      )}
                    />
                    <span className="text-muted-foreground">
                      {gap.gapType === "UNASSIGNED"
                        ? t("events.maps.gap.unassigned", "nieprzypisana")
                        : t("events.maps.gap.uncovered", "nieobstawiona")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(gap.startedAt), "HH:mm:ss")}
                      {gap.endedAt &&
                        ` - ${format(new Date(gap.endedAt), "HH:mm:ss")}`}
                    </span>
                    <span className="font-mono font-medium">
                      {formatGapDuration(gap.durationSeconds ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
              {closedGaps.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{closedGaps.length - 10}{" "}
                  {t("events.killDetail.coverageGaps.more", "więcej")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
