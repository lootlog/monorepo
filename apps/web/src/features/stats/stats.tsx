import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useGuildKillStats } from "./hooks/use-guild-kill-stats";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { NpcTypeStatsCards } from "./components/kill-stats-overview";
import { MemberRankingPodiumCard } from "./components/member-ranking-podium-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { LevelFilters } from "./components/level-filters";
import { StatsOverviewFiltersMobile } from "./components/stats-overview-filters-mobile";

export const Stats: React.FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
  } = useStatsSettings("overview");
  const { data: worlds } = useWorlds();
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
              onWorldChange={(value) =>
                setWorld(value === "ALL" ? null : value)
              }
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
            <Select
              value={settings.world ?? "ALL"}
              onValueChange={(value) =>
                setWorld(value === "ALL" ? null : value)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("kills.home.filters.world")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.home.filters.allWorlds")}
                </SelectItem>
                {worlds?.map((world) => (
                  <SelectItem key={world} value={world}>
                    {world.charAt(0).toUpperCase() + world.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
