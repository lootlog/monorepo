import { BandSection } from "@/components/common/band-section";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock3, MapPinned, Timer } from "lucide-react";
import { getCoveragePercentage } from "../../utils/coordination-utils";
import { formatTimeShort } from "../../utils/format-date";
import { getMapCoverageColorClassName } from "../../utils/get-map-coverage-color-class-name";
import type { EventCoordinationResponseDto } from "@lootlog/client/main";

interface EventCoordinationSummaryCardProps {
  coordination: EventCoordinationResponseDto;
}

export const EventCoordinationSummaryCard = ({
  coordination,
}: EventCoordinationSummaryCardProps) => {
  const { t } = useTranslation();
  const { summary } = coordination;
  const coveragePercentage = getCoveragePercentage(summary);

  return (
    <BandSection
      id="coordination-summary"
      title={t("events.coordination.title")}
      tiled
    >
      <StatsTileGrid className="grid-cols-2 xl:grid-cols-4">
        <StatsTile
          icon={AlertTriangle}
          label={t("events.coordination.priority.critical")}
          value={
            <span
              className={cn(summary.criticalCount > 0 && "text-signal-alert")}
            >
              {summary.criticalCount}
            </span>
          }
        />
        <StatsTile
          icon={Clock3}
          label={t("events.coordination.priority.warning")}
          value={
            <span
              className={cn(summary.warningCount > 0 && "text-signal-timer")}
            >
              {summary.warningCount}
            </span>
          }
        />
        <StatsTile
          icon={MapPinned}
          label={t("events.coordination.summary.coverageLabel")}
          value={
            <span
              className={cn(
                summary.totalMaps > 0 &&
                  getMapCoverageColorClassName(coveragePercentage),
              )}
            >
              {coveragePercentage}%
            </span>
          }
          detail={t("events.coordination.summary.coveredMaps", {
            covered: summary.coveredMaps,
            total: summary.totalMaps,
          })}
        />
        <StatsTile
          icon={Timer}
          label={t("events.coordination.summary.nextSpawnLabel")}
          value={
            summary.nextSpawnAt
              ? formatTimeShort(new Date(summary.nextSpawnAt))
              : t("events.coordination.summary.noNextSpawn")
          }
        />
      </StatsTileGrid>
    </BandSection>
  );
};
