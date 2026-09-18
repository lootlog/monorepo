import { useTranslation } from "react-i18next";
import { LootOverviewCards } from "./components/loot-overview-cards";
import { StatsChartCard } from "./components/stats-chart-card";
import { StatsFilterBarSkeleton } from "./components/stats-filter-bar-skeleton";

export const LootStatsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <StatsFilterBarSkeleton />
      <LootOverviewCards isLoading />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <StatsChartCard
          title={t("loots.stats.timeline.title")}
          className="xl:col-span-2"
          isLoading
        >
          {null}
        </StatsChartCard>
        <StatsChartCard title={t("loots.stats.topNpcs.title")} isLoading>
          {null}
        </StatsChartCard>
      </div>
    </div>
  );
};
