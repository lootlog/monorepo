import { KpiCard } from "@/components/common/kpi-card";
import { Clock, Gauge, Moon, Sparkles, Swords, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

const KPIS = [
  { icon: Swords, labelKey: "events.kills.kpiKills" },
  { icon: Sparkles, labelKey: "events.kills.kpiPoints" },
  { icon: Clock, labelKey: "events.kills.kpiTotalTime" },
  { icon: Moon, labelKey: "events.kills.kpiAvgAfk" },
  { icon: Gauge, labelKey: "events.kills.kpiAvgPointsPerKill" },
  { icon: Timer, labelKey: "events.kills.kpiAvgTimePerKill" },
] as const;

export const EventMemberSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <SkeletonPageHeader />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((kpi) => (
          <KpiCard
            key={kpi.labelKey}
            icon={kpi.icon}
            label={t(kpi.labelKey)}
            value={null}
            isLoading
          />
        ))}
      </div>
      <SkeletonFilterBar />
      <SkeletonSectionCard>
        <TableRowsSkeleton rows={7} withHeader />
      </SkeletonSectionCard>
    </div>
  );
};
