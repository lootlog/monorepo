import { EmptyState } from "@/components/common/empty-state";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerGetLootStatsQueryKey,
  useLootsControllerGetLootStats,
} from "@lootlog/client/main";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Globe } from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { LootOverviewCards } from "./components/loot-overview-cards";
import { LootStatsFilterBar } from "./components/loot-stats-filter-bar";
import { LootTopContributors } from "./components/loot-top-contributors";
import { LootTopItems } from "./components/loot-top-items";
import { StatsChartCard } from "./components/stats-chart-card";
import { useLootStatsSettings } from "./hooks/use-loot-stats-settings";
import { buildLootStatsParams } from "./utils/build-stats-query-params";

const LootTimelineChart = lazy(() =>
  import("./components/loot-timeline-chart").then((module) => ({
    default: module.LootTimelineChart,
  })),
);

const LootTopNpcsChart = lazy(() =>
  import("./components/loot-top-npcs-chart").then((module) => ({
    default: module.LootTopNpcsChart,
  })),
);

export const LootStats = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { settings, setPeriod, setWorld, setExcludeColossus } =
    useLootStatsSettings();

  const lootStatsParams = buildLootStatsParams({
    period: settings.period,
    world: settings.world ?? undefined,
    excludeColossus: settings.excludeColossus,
  });

  const { data, isLoading } = useLootsControllerGetLootStats(
    { guildId: guildId ?? "" },
    lootStatsParams,
    {
      query: {
        enabled: Boolean(guildId && settings.world),
        queryKey: getLootsControllerGetLootStatsQueryKey(
          { guildId: guildId ?? "" },
          lootStatsParams,
        ),
      },
    },
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex min-h-full flex-col gap-3 px-3 pb-3">
        <h1 className="sr-only">{t("common.stats.loots")}</h1>
        <LootStatsFilterBar
          world={settings.world}
          period={settings.period}
          excludeColossus={settings.excludeColossus}
          onWorldChange={setWorld}
          onPeriodChange={setPeriod}
          onExcludeColossusChange={setExcludeColossus}
        />

        {settings.world ? (
          <>
            <LootOverviewCards data={data?.overview} isLoading={isLoading} />

            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
              <Suspense
                fallback={
                  <StatsChartCard
                    title={t("loots.stats.timeline.title")}
                    className="xl:col-span-2"
                    isLoading
                  >
                    {null}
                  </StatsChartCard>
                }
              >
                <LootTimelineChart
                  data={data?.timeline}
                  period={settings.period}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                />
              </Suspense>
              <Suspense
                fallback={
                  <StatsChartCard
                    title={t("loots.stats.topNpcs.title")}
                    isLoading
                  >
                    {null}
                  </StatsChartCard>
                }
              >
                <LootTopNpcsChart data={data?.topNpcs} isLoading={isLoading} />
              </Suspense>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              <LootTopContributors
                data={data?.topContributors}
                isLoading={isLoading}
              />
              <LootTopItems data={data?.topItems} isLoading={isLoading} />
            </div>
          </>
        ) : (
          <EmptyState
            framed
            icon={Globe}
            title={t("loots.stats.selectWorld.title")}
            description={t("loots.stats.selectWorld.description")}
          />
        )}
      </div>
    </ScrollArea>
  );
};
