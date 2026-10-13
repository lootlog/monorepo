import { KpiCard } from "@/components/common/kpi-card";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Clock, Moon, Skull, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

const KPIS = [
  { icon: Swords, labelKey: "events.kills.kpiKills" },
  { icon: Sparkles, labelKey: "events.kills.kpiPoints" },
  { icon: Clock, labelKey: "events.kills.kpiTotalTime" },
  { icon: Moon, labelKey: "events.kills.kpiAvgAfk" },
] as const;

export const EventMemberSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
      {/* The ranking place metadata shows only for a single hero, so the
          default all-heroes view has none. */}
      <PageHeaderSkeleton
        media={<Skeleton className="size-14 shrink-0 rounded-xl" />}
      />
      <SkeletonFilterBar />
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
      <SectionCard className="w-full overflow-hidden">
        <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
        <TableRowsSkeleton rows={7} withHeader />
      </SectionCard>
    </div>
  );
};
