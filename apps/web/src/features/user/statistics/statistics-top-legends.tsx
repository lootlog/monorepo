import type { StatisticsSearch } from "./statistics-search";
import { StatisticsAllLegendsLink } from "./statistics-all-legends-link";
import { StatisticsLegends } from "./statistics-legends";
import { StatisticsQueryState } from "./statistics-query-state";
import { STATISTICS_PREVIEW_SIZE } from "./statistics-top-npcs";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";

/** The most frequent legendary drops, opening every legend from the heading. */
export function StatisticsTopLegends({ search }: { search: StatisticsSearch }) {
  const query = useStatisticsLootStats(search);
  const actions = <StatisticsAllLegendsLink search={search} />;

  // A failed load says so instead of showing no legends as current.
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
