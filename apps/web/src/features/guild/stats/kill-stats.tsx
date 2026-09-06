import { PageHeader } from "@/components/common/page-header";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

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
          <PageHeader
            title={t("common.stats.kills")}
            icon={BarChart3}
            actions={
              <div className="flex flex-col gap-3">
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
            }
          />

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
