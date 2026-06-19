import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock3, Crosshair, MapPinned } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";
import { getCoveragePercentage } from "../../utils/coordination-utils";
import type { EventCoordinationResponseDto } from "@/lib/api/generated/main/model";

interface EventCoordinationSummaryCardProps {
  coordination: EventCoordinationResponseDto;
}

export const EventCoordinationSummaryCard = ({
  coordination,
}: EventCoordinationSummaryCardProps) => {
  const { t } = useTranslation();
  const coveragePercentage = getCoveragePercentage(coordination.summary);
  const nextSpawnLabel = coordination.summary.nextSpawnAt
    ? new Date(coordination.summary.nextSpawnAt).toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : t("events.coordination.summary.noNextSpawn");

  return (
    <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
            <Crosshair className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">
              {t("events.coordination.title")}
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {t("events.coordination.description")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <AlertTriangle className="size-3 text-destructive" />
            {t("events.coordination.summary.critical", {
              count: coordination.summary.criticalCount,
            })}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock3 className="size-3 text-amber-500" />
            {t("events.coordination.summary.warning", {
              count: coordination.summary.warningCount,
            })}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <MapPinned className="size-3 text-green-500" />
            {t("events.coordination.summary.coverage", {
              covered: coordination.summary.coveredMaps,
              total: coordination.summary.totalMaps,
              percentage: coveragePercentage,
            })}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            {t("events.coordination.summary.nextSpawn", {
              time: nextSpawnLabel,
            })}
          </Badge>
        </div>
      </div>
    </Card>
  );
};
