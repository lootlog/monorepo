import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { useTranslation } from "react-i18next";
import { LootOverviewCards } from "@/components/common/loot-stats/loot-overview-cards";
import { LootTopContributors } from "./components/loot-top-contributors";
import { LootTopItems } from "./components/loot-top-items";
import { ChartSection } from "@/components/common/chart-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { FilterBar } from "@/components/common/filter-bar";
import { StatsFiltersSkeleton } from "./components/stats-filters-skeleton";

export const LootStatsPageSkeleton = () => {
  const { t } = useTranslation();
  const usesFilterBar = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  return (
    <div aria-busy="true">
      {/* Narrow pages open their filters from a button instead of a bar. */}
      <FilterBar ariaLabel={t("kills.filters.title")}>
        {usesFilterBar && <StatsFiltersSkeleton />}
      </FilterBar>
      <LootOverviewCards isLoading />
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <ChartSection title={t("loots.stats.timeline.title")} isLoading>
          {null}
        </ChartSection>
        <ChartSection title={t("loots.stats.topNpcs.title")} isLoading>
          {null}
        </ChartSection>
      </StatsSectionColumns>
      <StatsSectionColumns className="xl:grid-cols-2">
        <LootTopContributors isLoading />
        <LootTopItems isLoading />
      </StatsSectionColumns>
    </div>
  );
};
