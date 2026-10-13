import { FilterBar } from "@/components/common/filter-bar";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

type LootStatsFilterBarProps = {
  period: LootsControllerGetLootStatsPeriod;
  excludeColossus: boolean;
  onPeriodChange: (value: LootsControllerGetLootStatsPeriod) => void;
  onExcludeColossusChange: (value: boolean) => void;
};

export const LootStatsFilterBar = ({
  period,
  excludeColossus,
  onPeriodChange,
  onExcludeColossusChange,
}: LootStatsFilterBarProps) => {
  const { t } = useTranslation();

  const renderExcludeColossus = (id: string) => (
    <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04]">
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
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              <Filter data-icon="inline-start" aria-hidden="true" />
              {t("kills.filters.title")}
            </Button>
          }
        >
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
        <PeriodSelector value={period} onValueChange={onPeriodChange} />
        {renderExcludeColossus("exclude-colossus")}
      </div>
    </FilterBar>
  );
};
