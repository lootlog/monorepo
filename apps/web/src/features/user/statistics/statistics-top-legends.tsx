import type { StatisticsSearch } from "./statistics-search";
import { StatisticsAllLegendsLink } from "./statistics-all-legends-link";
import { StatisticsLegends } from "./statistics-legends";
import { STATISTICS_PREVIEW_SIZE } from "./statistics-top-npcs";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";

/** The most frequent legendary drops, opening every legend from the heading. */
export function StatisticsTopLegends({ search }: { search: StatisticsSearch }) {
  const { data, isPending } = useStatisticsLootStats(search);

  return (
    <StatisticsLegends
      legends={data?.legends}
      isLoading={isPending}
      size={STATISTICS_PREVIEW_SIZE}
      actions={<StatisticsAllLegendsLink search={search} />}
    />
  );
}
