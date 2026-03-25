import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PlayerKillStatsCard } from "./components/player-kill-stats-card";
import { TopKilledNpcsCard } from "./components/top-killed-npcs-card";
import { HomeFiltersBar } from "./components/home-filters";
import { useHomeFilters } from "./hooks/use-home-filters";

export const Home: React.FC = () => {
  const { filters, updateFilters } = useHomeFilters();

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        <HomeFiltersBar
          filters={filters}
          onWorldChange={(world) => updateFilters({ world })}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <PlayerKillStatsCard world={filters.world} />
          <TopKilledNpcsCard
            world={filters.world}
            npcType={filters.npcType}
            onNpcTypeChange={(npcType) => updateFilters({ npcType })}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
