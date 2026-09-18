import { FilterBar } from "@/components/common/filter-bar";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

type LootStatsFilterBarProps = {
  world: string | null;
  period: LootsControllerGetLootStatsPeriod;
  excludeColossus: boolean;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: LootsControllerGetLootStatsPeriod) => void;
  onExcludeColossusChange: (value: boolean) => void;
};

export const LootStatsFilterBar = ({
  world,
  period,
  excludeColossus,
  onWorldChange,
  onPeriodChange,
  onExcludeColossusChange,
}: LootStatsFilterBarProps) => {
  const { t } = useTranslation();

  const renderExcludeColossus = (id: string) => (
    <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04]">
      <Checkbox
        id={id}
        checked={excludeColossus}
        onCheckedChange={(checked) => onExcludeColossusChange(checked === true)}
      />
      <Label htmlFor={id} className="flex-1 cursor-pointer text-sm">
        {t("loots.stats.excludeColossus")}
      </Label>
    </div>
  );

  return (
    <FilterBar ariaLabel={t("kills.filters.title")}>
      <div className="w-full md:hidden">
        <MobileFiltersDrawer
          title={t("kills.filters.title")}
          closeLabel={t("kills.filters.close")}
          trigger={
            <Button variant="outline" className="h-10 w-full justify-start">
              <Filter data-icon="inline-start" aria-hidden="true" />
              {t("kills.filters.title")}
            </Button>
          }
        >
          <div className="space-y-2">
            <Label>{t("kills.filters.world")}</Label>
            <WorldSwitcher
              value={world}
              onValueChange={onWorldChange}
              width="w-full"
              triggerClassName="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("kills.filters.period")}</Label>
            <PeriodSelector
              value={period}
              onValueChange={onPeriodChange}
              width="w-full"
            />
          </div>
          {renderExcludeColossus("exclude-colossus-mobile")}
        </MobileFiltersDrawer>
      </div>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <WorldSwitcher
          value={world}
          onValueChange={onWorldChange}
          width="w-[200px]"
          triggerClassName="h-10"
        />
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-[200px]"
        />
        {renderExcludeColossus("exclude-colossus")}
      </div>
    </FilterBar>
  );
};
