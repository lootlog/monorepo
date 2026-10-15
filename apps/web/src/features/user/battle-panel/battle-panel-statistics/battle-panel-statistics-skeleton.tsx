import { ChartCard } from "@/components/common/chart-card";
import { FilterBar } from "@/components/common/filter-bar";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";
import { CombatProfileOverview } from "./components/combat-profile-overview";
import { StatisticsFilterToolbarSkeleton } from "./components/statistics-filter-toolbar-skeleton";

// The loaded cards are `ChartCard`s with static titles, so their own loading
// state is the skeleton.
export const BattlePanelStatisticsSkeleton = () => {
  const { t } = useTranslation();
  // Narrower pages open the filters from a floating button, leaving no bar.
  const listsFilters = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  return (
    <div aria-busy="true">
      {listsFilters && (
        <FilterBar>
          <StatisticsFilterToolbarSkeleton />
        </FilterBar>
      )}

      <div className="flex flex-col gap-3 p-3">
        <CombatProfileOverview data={undefined} isLoading />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          <ChartCard
            title={t("battlePanel.statistics.currentStreak.title")}
            description={t("battlePanel.statistics.currentStreak.description")}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.battleDuration.title")}
            description={t("battlePanel.statistics.battleDuration.description")}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.phGrowth.title")}
            description={t("battlePanel.statistics.phGrowth.description")}
            isLoading
            className="lg:col-span-2"
          >
            {null}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <ChartCard
            title={t("battlePanel.statistics.professionWinRate.title")}
            description={t(
              "battlePanel.statistics.professionWinRate.description",
            )}
            isLoading
          >
            {null}
          </ChartCard>
          <ChartCard
            title={t("battlePanel.statistics.directMatchups.title")}
            description={t("battlePanel.statistics.directMatchups.description")}
            isLoading
            actions={
              // Reserves the width of the link to the full record.
              <span className="flex h-8 items-center">
                <Skeleton className="h-3 w-20" />
              </span>
            }
          >
            {null}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};
