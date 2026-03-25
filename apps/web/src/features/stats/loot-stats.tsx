import { Globe, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useLootStats, type Period } from "./hooks/use-loot-stats";
import { useLootStatsSettings } from "./hooks/use-loot-stats-settings";
import { LootOverviewCards } from "./components/loot-overview-cards";
import { LootTimelineChart } from "./components/loot-timeline-chart";
import { LootRarityChart } from "./components/loot-rarity-chart";
import { LootTopNpcsChart } from "./components/loot-top-npcs-chart";
import { LootTopContributors } from "./components/loot-top-contributors";
import { LootTopItems } from "./components/loot-top-items";

export const LootStats: React.FC = () => {
  const { t } = useTranslation();
  const { settings, setPeriod, setWorld, setExcludeColossus } =
    useLootStatsSettings();
  const { data, isLoading } = useLootStats({
    period: settings.period,
    world: settings.world ?? undefined,
    excludeColossus: settings.excludeColossus,
  });

  if (!settings.world) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4 bg-background/50">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("loots.stats.selectWorldRequired")}
        </p>
        <WorldSwitcher value={settings.world} onValueChange={setWorld} />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-4">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 shadow-inner shadow-emerald-500/10">
                <Gift className="size-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight">
                  {t("common.stats.loots")}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap gap-y-4">
              <PeriodSelector
                value={settings.period}
                onValueChange={(value) => setPeriod(value as Period)}
                width="w-[180px]"
                className="h-9"
              />
              <WorldSwitcher
                value={settings.world}
                onValueChange={setWorld}
                width="w-[140px]"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exclude-colossus"
                  checked={settings.excludeColossus}
                  onCheckedChange={(checked) => setExcludeColossus(!!checked)}
                />
                <Label
                  htmlFor="exclude-colossus"
                  className="cursor-pointer text-sm"
                >
                  {t("loots.stats.excludeColossus")}
                </Label>
              </div>
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
  );
};
