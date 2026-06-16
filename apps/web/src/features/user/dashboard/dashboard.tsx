import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PlayerKillStatsCard } from "./components/player-kill-stats-card";
import { TopKilledNpcsCard } from "./components/top-killed-npcs-card";
import { DashboardFiltersBar } from "./components/dashboard-filters";
import { useDashboardFilters } from "./hooks/use-dashboard-filters";

export const Dashboard: React.FC = () => {
  const { filters, updateFilters } = useDashboardFilters();

  return (
    <ScrollArea className="h-full">
      <div className="px-3 py-3 flex flex-col gap-4">
        <DashboardFiltersBar
          filters={filters}
          onWorldChange={(world) => updateFilters({ world })}
          onPeriodChange={(period) => updateFilters({ period })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <PlayerKillStatsCard world={filters.world} period={filters.period} />
          <TopKilledNpcsCard
            world={filters.world}
            npcType={filters.npcType}
            period={filters.period}
            onNpcTypeChange={(npcType) => updateFilters({ npcType })}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
