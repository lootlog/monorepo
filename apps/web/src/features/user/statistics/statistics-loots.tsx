import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { LootOverviewCards } from "@/components/common/loot-stats/loot-overview-cards";
import { StatisticsLegends } from "./statistics-legends";
import { Link } from "@tanstack/react-router";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { StatisticsMonsterLegends } from "./statistics-monster-legends";
import { StatisticsAllLegendsLink } from "./statistics-all-legends-link";
import { STATISTICS_PREVIEW_SIZE } from "./statistics-top-npcs";
import { StatisticsQueryState } from "./statistics-query-state";
import type { StatisticsSearch } from "./statistics-search";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";

const LootTimelineChart = lazy(() =>
  import("@/components/common/loot-stats/loot-timeline-chart").then(
    (module) => ({ default: module.LootTimelineChart }),
  ),
);

const LootTopNpcsChart = lazy(() =>
  import("@/components/common/loot-stats/loot-top-npcs-chart").then(
    (module) => ({ default: module.LootTopNpcsChart }),
  ),
);

/** Loots of the fights the user's characters took part in. */
export function StatisticsLoots({ search }: { search: StatisticsSearch }) {
  const { t } = useTranslation();
  const query = useStatisticsLootStats(search);
  const { data, isPending: isLoading } = query;

  // The sections stand in for themselves while the numbers load.
  const content = (
    <>
      <LootOverviewCards
        data={data?.overview}
        caughtLegendaryItems={data?.overview.caughtLegendaryItems}
        isLoading={isLoading}
      />
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <Suspense
          fallback={
            <ChartSection title={t("loots.stats.timeline.title")} isLoading>
              {null}
            </ChartSection>
          }
        >
          <LootTimelineChart data={data?.timeline} isLoading={isLoading} />
        </Suspense>
        <Suspense
          fallback={
            <ChartSection title={t("loots.stats.topNpcs.title")} isLoading>
              {null}
            </ChartSection>
          }
        >
          <LootTopNpcsChart data={data?.topNpcs} isLoading={isLoading} />
        </Suspense>
      </StatsSectionColumns>
      <StatsSectionColumns className="xl:grid-cols-2">
        <StatisticsLegends
          legends={data?.legends}
          isLoading={isLoading}
          size={STATISTICS_PREVIEW_SIZE}
          actions={<StatisticsAllLegendsLink search={search} />}
        />
        <StatisticsMonsterLegends
          monsters={data?.monsters}
          isLoading={isLoading}
          size={STATISTICS_PREVIEW_SIZE}
          actions={
            <ChevronLink
              render=<Link
                to="/@me/statistics"
                search={{ ...search, tab: "monsters" }}
              />
            >
              {t("statistics.allMonsters")}
            </ChevronLink>
          }
        />
      </StatsSectionColumns>
    </>
  );

  return (
    <StatisticsQueryState query={query} loading={content}>
      {content}
    </StatisticsQueryState>
  );
}
