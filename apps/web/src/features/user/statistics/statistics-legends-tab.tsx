import { cn } from "cn";
import { StatisticsQueryState } from "./statistics-query-state";
import type { StatisticsSearch } from "./statistics-search";
import { StatisticsLegendsTable } from "./statistics-legends-table";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";
import { useStatisticsSort } from "./use-statistics-sort";
import { matchesStatisticsQuery } from "./statistics-query";

/** The legends tab: every legendary drop of the user's fights. */
export function StatisticsLegendsTab({ search }: { search: StatisticsSearch }) {
  const query = useStatisticsLootStats(search);
  const { sort, onSortChange } = useStatisticsSort("legends", search);

  // The table runs edge to edge; a lone notice or placeholder keeps an inset.
  return (
    <div className={cn(!query.data && "p-3")}>
      <StatisticsQueryState query={query}>
        {query.data && (
          <StatisticsLegendsTable
            legends={query.data.legends.filter((legend) =>
              matchesStatisticsQuery(search.q, legend.name, legend.npc.name),
            )}
            filtered={Boolean(search.q?.trim())}
            sort={sort}
            onSortChange={onSortChange}
          />
        )}
      </StatisticsQueryState>
    </div>
  );
}
