import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerGetLootStatsQueryKey,
  useLootsControllerGetLootStats,
} from "@lootlog/client/main";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

import { LootOverviewCards } from "@/components/common/loot-stats/loot-overview-cards";
import { LootStatsFilterBar } from "./components/loot-stats-filter-bar";
import { LootTopContributors } from "./components/loot-top-contributors";
import { LootTopItems } from "./components/loot-top-items";
import { ChartSection } from "@/components/common/chart-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { useLootStatsSettings } from "./hooks/use-loot-stats-settings";
import { buildLootStatsParams } from "./utils/build-stats-query-params";

const LootTimelineChart = lazy(() =>
  import("@/components/common/loot-stats/loot-timeline-chart").then(
    (module) => ({
      default: module.LootTimelineChart,
    }),
  ),
);

const LootTopNpcsChart = lazy(() =>
  import("@/components/common/loot-stats/loot-top-npcs-chart").then(
    (module) => ({
      default: module.LootTopNpcsChart,
    }),
  ),
);

export const LootStats = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { settings, setPeriod, setExcludeColossus } = useLootStatsSettings();

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
        enabled: Boolean(guildId),
        queryKey: getLootsControllerGetLootStatsQueryKey(
          { guildId: guildId ?? "" },
          lootStatsParams,
        ),
      },
    },
  );

  return (
    <div>
      <h1 className="sr-only">{t("common.stats.loots")}</h1>
      <LootStatsFilterBar
        period={settings.period}
        excludeColossus={settings.excludeColossus}
        onPeriodChange={setPeriod}
        onExcludeColossusChange={setExcludeColossus}
      />

      <LootOverviewCards data={data?.overview} isLoading={isLoading} />
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <Suspense
          fallback={
            <ChartSection title={t("loots.stats.timeline.title")} isLoading>
              {null}
            </ChartSection>
          }
        >
          <LootTimelineChart
            data={data?.timeline}
            hourly={settings.period === "24h" || settings.period === "3d"}
            isLoading={isLoading}
          />
        </Suspense>
        <Suspense
          fallback={
            <ChartSection title={t("loots.stats.topNpcs.title")} isLoading>
              {null}
            </ChartSection>
          }
        >
          <LootTopNpcsChart data={data?.topNpcs} isLoading={isLoading} />
        </Suspense>
      </StatsSectionColumns>
      <StatsSectionColumns className="xl:grid-cols-2">
        <LootTopContributors
          data={data?.topContributors}
          isLoading={isLoading}
        />
        <LootTopItems data={data?.topItems} isLoading={isLoading} />
      </StatsSectionColumns>
    </div>
  );
};
