import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { BattleAnalyticsOverviewSkeleton } from "./components/battle-analytics-overview-skeleton";
import { StatisticsFilterToolbarSkeleton } from "./components/statistics-filter-toolbar-skeleton";

/** The analytics page while the character and its numbers load. */
export const BattlePanelStatisticsSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="min-w-0">
      <FilterBar
        search={
          <Skeleton aria-hidden="true" className="h-10 w-55 rounded-lg" />
        }
      >
        <StatisticsFilterToolbarSkeleton />
      </FilterBar>
      <BattleAnalyticsOverviewSkeleton />
    </div>
  );
};
