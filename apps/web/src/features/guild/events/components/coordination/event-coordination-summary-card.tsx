import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Clock3,
  Crosshair,
  MapPinned,
  Timer,
} from "lucide-react";
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
    <>
      <PageHeader
        icon={Crosshair}
        title={t("events.coordination.title")}
        description={t("events.coordination.description")}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={AlertTriangle}
          label={t("events.coordination.priority.critical")}
          value={summary.criticalCount}
          valueClassName={
            summary.criticalCount > 0 ? "text-signal-alert" : undefined
          }
        />
        <KpiCard
          icon={Clock3}
          label={t("events.coordination.priority.warning")}
          value={summary.warningCount}
          valueClassName={
            summary.warningCount > 0 ? "text-signal-timer" : undefined
          }
        />
        <KpiCard
          icon={MapPinned}
          label={t("events.coordination.summary.coverageLabel")}
          value={`${coveragePercentage}%`}
          valueClassName={
            summary.totalMaps > 0
              ? getMapCoverageColorClassName(coveragePercentage)
              : undefined
          }
          detail={t("events.coordination.summary.coveredMaps", {
            covered: summary.coveredMaps,
            total: summary.totalMaps,
          })}
        />
        <KpiCard
          icon={Timer}
          label={t("events.coordination.summary.nextSpawnLabel")}
          value={
            summary.nextSpawnAt
              ? formatTimeShort(new Date(summary.nextSpawnAt))
              : t("events.coordination.summary.noNextSpawn")
          }
        />
      </div>
    </>
  );
};
