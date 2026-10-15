import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { KpiCard } from "@/components/common/kpi-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Clock, Moon, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { MemberKillRowsSkeleton } from "./components/member-kills/member-kill-rows-skeleton";

const KPIS = [
  { icon: Swords, labelKey: "events.kills.kpiKills" },
  { icon: Sparkles, labelKey: "events.kills.kpiPoints" },
  { icon: Clock, labelKey: "events.kills.kpiTotalTime" },
  { icon: Moon, labelKey: "events.kills.kpiAvgAfk" },
] as const;

/** Route-level stand-in for a member's event page: its details, hero tabs, totals and kills. */
export const EventMemberSkeleton = () => {
  const { t } = useTranslation();

  return (
    <DetailSkeleton
      meta={
        // The ranking place shows only for a single hero, so the default
        // all-heroes view has the event name alone.
        <span className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-28" />
        </span>
      }
    >
      <SkeletonFilterBar />
      <div className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
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
      <MemberKillRowsSkeleton />
    </DetailSkeleton>
  );
};
