import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock3, Crosshair, MapPinned } from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { getCoveragePercentage } from "../../utils/coordination-utils";
import type { EventCoordinationResponseDto } from "@lootlog/client/main";

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
    <PageHeader
      icon={Crosshair}
      title={t("events.coordination.title")}
      description={t("events.coordination.description")}
      metadata={
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
      }
    />
  );
};
