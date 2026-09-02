import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  getKillsControllerGetGuildKillStatsQueryKey,
  useKillsControllerGetGuildKillStats,
} from "@lootlog/client/main";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { NpcTypeStatsCards } from "./components/kill-stats-overview";
import { MemberRankingPodiumCard } from "./components/member-ranking-podium-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { LevelFilters } from "./components/level-filters";
import { StatsOverviewFiltersMobile } from "./components/stats-overview-filters-mobile";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";
import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";

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
    setPeriod,
  } = useStatsSettings("overview");
  const killStatsParams = buildGuildKillStatsParams({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });
  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildKillStatsQueryKey(
          { guildId },
          killStatsParams,
        ),
      },
    },
  );
  const isMobile = useIsMobile();
  const hasActiveFilters =
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all";

  return (
    <>
      <ScrollArea className="h-full bg-background">
        <div className="px-3 pb-3 flex flex-col gap-4">
          <Card className="gap-3 border-border bg-card p-4">
            <div className="flex flex-col gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">
                    {t("common.stats.kills")}
                  </h2>
                </div>
              </div>
              <div className="hidden w-full grid-cols-2 gap-2 md:grid min-[1280px]:grid-cols-4">
                <LevelFilters
                  minLvl={settings.minLvl}
                  maxLvl={settings.maxLvl}
                  onMinLvlChange={setMinLvl}
                  onMaxLvlChange={setMaxLvl}
                  inputClassName="min-w-0 w-full"
                />
                <KillStatsPeriodSelect
                  value={settings.period}
                  onValueChange={setPeriod}
                  className="w-full"
                />
                <WorldSwitcher
                  value={settings.world}
                  onValueChange={setWorld}
                  showAllOption
                  width="w-full"
                />
              </div>
            </div>
          </Card>

          <NpcTypeStatsCards data={data?.overview} isLoading={isLoading} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
            <MemberRankingPodiumCard
              data={data?.memberRanking}
              isLoading={isLoading}
              guildId={guildId}
              hasActiveFilters={hasActiveFilters}
            />
            <TopNpcsCard
              world={settings.world ?? undefined}
              minLvl={debouncedMinLvl}
              maxLvl={debouncedMaxLvl}
              period={settings.period}
            />
          </div>
        </div>
      </ScrollArea>
      {isMobile && (
        <StatsOverviewFiltersMobile
          world={settings.world}
          minLvl={settings.minLvl}
          maxLvl={settings.maxLvl}
          period={settings.period}
          onWorldChange={setWorld}
          onMinLvlChange={setMinLvl}
          onMaxLvlChange={setMaxLvl}
          onPeriodChange={setPeriod}
        />
      )}
    </>
  );
};
