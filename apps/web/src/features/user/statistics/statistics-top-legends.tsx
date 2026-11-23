import type { StatisticsSearch } from "./statistics-search";
import { StatisticsAllLegendsLink } from "./statistics-all-legends-link";
import { StatisticsLegends } from "./statistics-legends";
import { StatisticsQueryState } from "@/components/common/statistics-query-state";
import { STATISTICS_PREVIEW_SIZE } from "./statistics-top-npcs";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";

export function StatisticsTopLegends({ search }: { search: StatisticsSearch }) {
  const query = useStatisticsLootStats(search);
  const actions = <StatisticsAllLegendsLink search={search} />;

  return (
    <StatisticsQueryState
      query={query}
      compact
      loading={
        <StatisticsLegends
          isLoading
          size={STATISTICS_PREVIEW_SIZE}
          actions={actions}
        />
      }
    >
      <StatisticsLegends
        legends={query.data?.legends}
        isLoading={false}
        size={STATISTICS_PREVIEW_SIZE}
        actions={actions}
      />
    </StatisticsQueryState>
  );
}
