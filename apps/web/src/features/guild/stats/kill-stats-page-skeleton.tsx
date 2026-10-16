import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { ChartSection } from "@/components/common/chart-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "@/components/common/kill-analytics/kill-stats-overview";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { FilterBar } from "@/components/common/filter-bar";
import { StatsFiltersSkeleton } from "./components/stats-filters-skeleton";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";

export const KillStatsPageSkeleton = () => {
  const { t } = useTranslation();
  const usesFilterBar = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  return (
    <div aria-busy="true">
      {/* Narrow pages open their filters from a button instead of a bar. */}
      <FilterBar ariaLabel={t("kills.filters.title")}>
        {usesFilterBar && <StatsFiltersSkeleton />}
      </FilterBar>
      <KillStatsOverview
        isLoading
        types={TRACKABLE_NPC_TYPES.map((type) => ({ type, kills: 0 }))}
      />
      <StatsSectionColumns className="xl:grid-cols-2">
        <StatsLeaderboardSection
          title={t("kills.memberRanking.title")}
          isLoading
        >
          {null}
        </StatsLeaderboardSection>
        <StatsLeaderboardSection title={t("kills.topNpcs.title")} isLoading>
          {null}
        </StatsLeaderboardSection>
      </StatsSectionColumns>
      <ChartSection title={t("statistics.daily")} isLoading>
        {null}
      </ChartSection>
    </div>
  );
};
