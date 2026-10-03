import { KpiCard } from "@/components/common/kpi-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { AlertTriangle, Clock3, MapPinned, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";

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
      <PageHeaderSkeleton />
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
        <SectionCardSkeleton key={index} withIcon withDescription={false}>
          <div className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </SectionCardSkeleton>
      ))}
    </div>
  );
};
