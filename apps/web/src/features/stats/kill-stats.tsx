import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useGuildKillStats } from "./hooks/use-guild-kill-stats";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { NpcTypeStatsCards } from "./components/kill-stats-overview";
import { MemberRankingPodiumCard } from "./components/member-ranking-podium-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { LevelFilters } from "./components/level-filters";
import { TimeBucketSelect } from "./components/time-bucket-select";
import { StatsOverviewFiltersMobile } from "./components/stats-overview-filters-mobile";

export const KillStats: React.FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setTimeBucket,
  } = useStatsSettings("overview");
  const { data, isLoading } = useGuildKillStats({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    timeBucket: settings.timeBucket,
  });
  const isMobile = useIsMobile();

  return (
    <>
      <ScrollArea className="h-full bg-background/50">
        <div className="px-3 pb-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                  <BarChart3 className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("common.stats.kills")}
                  </h2>
                </div>
              </div>
              <div className="hidden md:flex justify-end gap-2">
                <TimeBucketSelect
                  value={settings.timeBucket ?? "all"}
                  onValueChange={setTimeBucket}
                />
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
            </div>
          </Card>

          <NpcTypeStatsCards data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-4 md:grid-cols-2">
            <MemberRankingPodiumCard
              data={data?.memberRanking}
              isLoading={isLoading}
              guildId={guildId}
            />
            <TopNpcsCard
              world={settings.world ?? undefined}
              minLvl={debouncedMinLvl}
              maxLvl={debouncedMaxLvl}
              timeBucket={settings.timeBucket}
            />
          </div>
        </div>
      </ScrollArea>
      {isMobile && (
        <StatsOverviewFiltersMobile
          world={settings.world}
          minLvl={settings.minLvl}
          maxLvl={settings.maxLvl}
          timeBucket={settings.timeBucket ?? "all"}
          onWorldChange={setWorld}
          onMinLvlChange={setMinLvl}
          onMaxLvlChange={setMaxLvl}
          onTimeBucketChange={setTimeBucket}
        />
      )}
    </>
  );
};
