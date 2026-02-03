import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
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
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("loots.stats.selectWorldRequired")}</p>
        <WorldSwitcher value={settings.world} onValueChange={setWorld} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2 items-center">
        <div className="flex items-center gap-2 mr-auto">
          <Checkbox
            id="exclude-colossus"
            checked={settings.excludeColossus}
            onCheckedChange={(checked) => setExcludeColossus(!!checked)}
          />
          <Label htmlFor="exclude-colossus" className="cursor-pointer text-sm">
            {t("loots.stats.excludeColossus")}
          </Label>
        </div>
        <PeriodSelector
          value={settings.period}
          onValueChange={(value) => setPeriod(value as Period)}
          width="w-[180px]"
        />
        <WorldSwitcher
          value={settings.world}
          onValueChange={setWorld}
          width="w-[140px]"
        />
      </div>

      <LootOverviewCards data={data?.overview} isLoading={isLoading} />

      <div className="grid gap-3 md:grid-cols-2">
        <LootTopContributors data={data?.topContributors} isLoading={isLoading} />
        <LootRarityChart data={data?.byRarity} isLoading={isLoading} />
      </div>

      <LootTimelineChart
        data={data?.timeline}
        period={settings.period}
        isLoading={isLoading}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <LootTopNpcsChart data={data?.topNpcs} isLoading={isLoading} />
        <LootTopItems data={data?.topItems} isLoading={isLoading} />
      </div>
    </div>
  );
};
