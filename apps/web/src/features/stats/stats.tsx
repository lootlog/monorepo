import { useState } from "react";
import {
  useGuildKillStats,
  type GuildKillStatsFilters,
} from "./hooks/use-guild-kill-stats";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { KillStatsFilters } from "./components/kill-stats-filters";
import { KillStatsMemberTable } from "./components/kill-stats-member-table";

export const Stats: React.FC = () => {
  const [filters, setFilters] = useState<GuildKillStatsFilters>({});
  const { data, isLoading } = useGuildKillStats(filters);

  return (
    <div className="flex flex-row w-full h-[calc(100%-65px)]">
      <div className="w-full h-full overflow-auto">
        <div className="p-4 space-y-6">
          <KillStatsOverview data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <KillStatsFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
            <div className="lg:col-span-3">
              <KillStatsMemberTable
                data={data?.memberRanking}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
