import { ChartCard } from "@/components/common/chart-card";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { FilterBar } from "@/components/common/filter-bar";
import { StatsFiltersSkeleton } from "./components/stats-filters-skeleton";
import { StatsLeaderboardCard } from "./components/stats-leaderboard-card";

export const KillStatsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div aria-busy="true">
      <FilterBar ariaLabel={t("kills.filters.title")}>
        <StatsFiltersSkeleton />
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
