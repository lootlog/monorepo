import { Globe, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerGetLootStatsQueryKey,
  useLootsControllerGetLootStats,
} from "@lootlog/client/main";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";
import { useLootStatsSettings } from "./hooks/use-loot-stats-settings";
import { LootOverviewCards } from "./components/loot-overview-cards";
import { LootTimelineChart } from "./components/loot-timeline-chart";
import { LootRarityChart } from "./components/loot-rarity-chart";
import { LootTopNpcsChart } from "./components/loot-top-npcs-chart";
import { LootTopContributors } from "./components/loot-top-contributors";
import { LootTopItems } from "./components/loot-top-items";
import { LootStatsFiltersMobile } from "./components/loot-stats-filters-mobile";
import { buildLootStatsParams } from "./utils/build-stats-query-params";

export const LootStats: React.FC = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { settings, setPeriod, setWorld, setExcludeColossus } =
    useLootStatsSettings();
  const isMobile = useIsMobile();
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

  if (!settings.world) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[400px] gap-4 bg-background">
          <Globe className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {t("loots.stats.selectWorldRequired")}
          </p>
          <WorldSwitcher value={settings.world} onValueChange={setWorld} />
        </div>
        {isMobile && (
          <LootStatsFiltersMobile
            world={settings.world}
            period={settings.period}
            excludeColossus={settings.excludeColossus}
            onWorldChange={setWorld}
            onPeriodChange={setPeriod}
            onExcludeColossusChange={setExcludeColossus}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ScrollArea className="h-full bg-background px-3 pb-3">
        <div className="flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-xl bg-emerald-500/10 p-2.5">
                  <Gift className="size-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("common.stats.loots")}
                  </h2>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 flex-wrap gap-y-4">
                <PeriodSelector
                  value={settings.period}
                  onValueChange={(value) =>
                    setPeriod(value as LootsControllerGetLootStatsPeriod)
                  }
                  width="w-[180px]"
                  className="h-9"
                />
                <WorldSwitcher
                  value={settings.world}
                  onValueChange={setWorld}
                  width="w-[140px]"
                />
                <label
                  htmlFor="exclude-colossus"
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  <Checkbox
                    id="exclude-colossus"
                    checked={settings.excludeColossus}
                    onCheckedChange={(checked) => setExcludeColossus(!!checked)}
                  />
                  <span className="select-none text-sm">
                    {t("loots.stats.excludeColossus")}
                  </span>
                </label>
              </div>
            </div>
          </Card>

          <LootOverviewCards data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-4 md:grid-cols-2">
            <LootTopContributors
              data={data?.topContributors}
              isLoading={isLoading}
            />
            <LootRarityChart data={data?.byRarity} isLoading={isLoading} />
          </div>

          <LootTimelineChart
            data={data?.timeline}
            period={settings.period}
            isLoading={isLoading}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <LootTopNpcsChart data={data?.topNpcs} isLoading={isLoading} />
            <LootTopItems data={data?.topItems} isLoading={isLoading} />
          </div>
        </div>
      </ScrollArea>
      {isMobile && (
        <LootStatsFiltersMobile
          world={settings.world}
          period={settings.period}
          excludeColossus={settings.excludeColossus}
          onWorldChange={setWorld}
          onPeriodChange={setPeriod}
          onExcludeColossusChange={setExcludeColossus}
        />
      )}
    </>
  );
};
