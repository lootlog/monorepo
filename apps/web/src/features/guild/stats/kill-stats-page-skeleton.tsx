import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { ChartCard } from "@/components/common/chart-card";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { FilterBar } from "@/components/common/filter-bar";
import { StatsFiltersSkeleton } from "./components/stats-filters-skeleton";
import { StatsLeaderboardCard } from "./components/stats-leaderboard-card";

export const KillStatsPageSkeleton = () => {
  const { t } = useTranslation();
  const usesFilterBar = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  return (
    <div aria-busy="true">
      {/* Narrow pages open their filters from a button instead of a bar. */}
      <FilterBar ariaLabel={t("kills.filters.title")}>
        {usesFilterBar && <StatsFiltersSkeleton />}
      </FilterBar>
      <div className="flex flex-col gap-3 p-3">
        <KillStatsOverview isLoading />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <StatsLeaderboardCard
            title={t("kills.memberRanking.title")}
            isLoading
          >
            {null}
          </StatsLeaderboardCard>
          <StatsLeaderboardCard title={t("kills.topNpcs.title")} isLoading>
            {null}
          </StatsLeaderboardCard>
        </div>
        <ChartCard title={t("statistics.daily")} isLoading>
          {null}
        </ChartCard>
      </div>
    </div>
  );
};
