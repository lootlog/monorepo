import { cn } from "cn";
import { StatisticsQueryState } from "./statistics-query-state";
import type { StatisticsSearch } from "./statistics-search";
import { StatisticsLegendsTable } from "./statistics-legends-table";
import { useStatisticsLootStats } from "./use-statistics-loot-stats";
import { useStatisticsSort } from "./use-statistics-sort";
import { matchesStatisticsQuery } from "./statistics-query";

export function StatisticsLegendsTab({ search }: { search: StatisticsSearch }) {
  const query = useStatisticsLootStats(search);
  const { sort, onSortChange } = useStatisticsSort("legends", search);

  return (
    <div className={cn(!query.data && "p-3")}>
      <StatisticsQueryState query={query}>
        {query.data && (
          <StatisticsLegendsTable
            legends={query.data.legends.filter((legend) =>
              matchesStatisticsQuery(search.q, legend.name, legend.npc.name),
            )}
            filtered={Boolean(search.q?.trim())}
            showCharacters={!search.characterId}
            sort={sort}
            onSortChange={onSortChange}
          />
        )}
      </StatisticsQueryState>
    </div>
  );
}
