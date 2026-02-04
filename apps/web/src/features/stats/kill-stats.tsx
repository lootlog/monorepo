import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useGuildKillStats } from "./hooks/use-guild-kill-stats";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { NpcTypeStatsCards } from "./components/kill-stats-overview";
import { MemberRankingPodiumCard } from "./components/member-ranking-podium-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { LevelFilters } from "./components/level-filters";
import { StatsOverviewFiltersMobile } from "./components/stats-overview-filters-mobile";

export const KillStats: React.FC = () => {
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
  } = useStatsSettings("overview");
  const { data, isLoading } = useGuildKillStats({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
  });

  return (
    <ScrollArea className="h-full">
      <div className="w-full p-3">
        <div className="space-y-3">
          <div className="flex justify-end md:hidden">
            <StatsOverviewFiltersMobile
              world={settings.world}
              minLvl={settings.minLvl}
              maxLvl={settings.maxLvl}
              onWorldChange={setWorld}
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
          </div>

          <div className="hidden md:flex justify-end gap-2">
            <LevelFilters
              minLvl={settings.minLvl}
              maxLvl={settings.maxLvl}
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
            <WorldSwitcher
              value={settings.world}
              onValueChange={setWorld}
              showAllOption
              width="w-[160px]"
            />
          </div>

          <NpcTypeStatsCards data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-3 md:grid-cols-2">
            <MemberRankingPodiumCard
              data={data?.memberRanking}
              isLoading={isLoading}
              guildId={guildId}
            />
            <TopNpcsCard
              world={settings.world ?? undefined}
              minLvl={debouncedMinLvl}
              maxLvl={debouncedMaxLvl}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
