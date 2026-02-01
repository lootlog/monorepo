import { PlayerKillStatsCard } from "./components/player-kill-stats-card";
import { TopKilledNpcsCard } from "./components/top-killed-npcs-card";
import { HomeFiltersBar } from "./components/home-filters";
import { useHomeFilters } from "./hooks/use-home-filters";

export const Home: React.FC = () => {
  const { filters, updateFilters } = useHomeFilters();

  return (
    <div className="w-full h-full p-3">
      <div className="space-y-3">
        <HomeFiltersBar
          filters={filters}
          onWorldChange={(world) => updateFilters({ world })}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <PlayerKillStatsCard world={filters.world} />
          <TopKilledNpcsCard
            world={filters.world}
            npcType={filters.npcType}
            onNpcTypeChange={(npcType) => updateFilters({ npcType })}
          />
        </div>
      </div>
    </div>
  );
};
