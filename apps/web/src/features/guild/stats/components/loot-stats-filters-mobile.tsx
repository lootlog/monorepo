import { useTranslation } from "react-i18next";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";

type LootStatsFiltersMobileProps = {
  world: string | null;
  period: LootsControllerGetLootStatsPeriod;
  excludeColossus: boolean;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: LootsControllerGetLootStatsPeriod) => void;
  onExcludeColossusChange: (value: boolean) => void;
};

export const LootStatsFiltersMobile = ({
  world,
  period,
  excludeColossus,
  onWorldChange,
  onPeriodChange,
  onExcludeColossusChange,
}: LootStatsFiltersMobileProps) => {
  const { t } = useTranslation();

  return (
    <MobileFiltersDrawer
      title={t("kills.filters.title")}
      closeLabel={t("kills.filters.close")}
      trigger="floating"
    >
      <div className="space-y-2">
        <Label>{t("kills.filters.world")}</Label>
        <WorldSwitcher
          value={world}
          onValueChange={onWorldChange}
          width="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("loots.stats.filters.period")}</Label>
        <PeriodSelector
          value={period}
          onValueChange={(value) =>
            onPeriodChange(value as LootsControllerGetLootStatsPeriod)
          }
          width="w-full"
          className="h-9"
        />
      </div>

      <label
        htmlFor="exclude-colossus-mobile"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
      >
        <Checkbox
          id="exclude-colossus-mobile"
          checked={excludeColossus}
          onCheckedChange={(checked) => onExcludeColossusChange(!!checked)}
        />
        <span className="select-none text-sm">
          {t("loots.stats.excludeColossus")}
        </span>
      </label>
    </MobileFiltersDrawer>
  );
};
