import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  AlertTriangle,
  Clock3,
  Crosshair,
  MapPinned,
  Timer,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const KPIS = [
  { icon: AlertTriangle, labelKey: "events.coordination.priority.critical" },
  { icon: Clock3, labelKey: "events.coordination.priority.warning" },
  { icon: MapPinned, labelKey: "events.coordination.summary.coverageLabel" },
  { icon: Timer, labelKey: "events.coordination.summary.nextSpawnLabel" },
] as const;

export const EventCoordinationSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      <PageHeader
        icon={Crosshair}
        title={t("events.coordination.title")}
        description={t("events.coordination.description")}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      {Array.from({ length: 3 }, (_, index) => (
        <SectionCard key={index}>
          <SectionCardHeader
            title=<SkeletonLine className="h-4 w-32" />
            // Stands in for the 32px "open maps" chevron link.
            actions={
              <span className="flex h-8 items-center">
                <Skeleton className="h-3 w-24" />
              </span>
            }
          />
          <div className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </SectionCard>
      ))}
    </div>
  );
};
