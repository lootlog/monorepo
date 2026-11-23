import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { Skeleton } from "@lootlog/ui/components/skeleton";
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

export const EventMemberSkeleton = () => {
  const { t } = useTranslation();

  return (
    <DetailSkeleton
      meta={
        <span className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-28" />
        </span>
      }
    >
      <SkeletonFilterBar />
      <StatsTileGrid className="sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <StatsTile
            key={kpi.labelKey}
            icon={kpi.icon}
            label={t(kpi.labelKey)}
            value={<Skeleton className="h-7 w-16" />}
          />
        ))}
      </StatsTileGrid>
      <MemberKillRowsSkeleton />
    </DetailSkeleton>
  );
};
