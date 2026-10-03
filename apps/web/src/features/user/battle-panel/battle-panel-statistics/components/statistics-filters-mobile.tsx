import { CharacterSelector } from "@/components/filters/character-selector";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Filter, Award } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import type { StatisticsFiltersProps } from "./statistics-filters";
import { useTranslation } from "react-i18next";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";

export const StatisticsFiltersMobile = ({
  characterId,
  period,
  minLevel,
  maxLevel,
  ph,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhChange,
}: StatisticsFiltersProps) => {
  const { t } = useTranslation();

  return (
    <MobileFiltersDrawer
      title={t("battlePanel.filters.statisticsTitle")}
      closeLabel={t("battlePanel.actions.close")}
      childrenClassName="pr-2"
      trigger={
        <Button variant="outline" className="h-10 w-full justify-between">
          <span className="flex items-center gap-2">
            <Filter data-icon="inline-start" />
            {t("battlePanel.filters.title")}
          </span>
        </Button>
      }
    >
      <div className="space-y-2">
        <Label>{t("battlePanel.filters.character")}</Label>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          size="default"
          className="h-10 w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("battlePanel.filters.period")}</Label>
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          excludePeriods={["24h", "3d", "14d", "180d"]}
          placeholder={t("battlePanel.filters.period")}
          allLabel={t("battlePanel.filters.periodOptions.all")}
          width="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("battlePanel.filters.levelRange")}</Label>
        <LevelRangeFilter
          minLevel={minLevel}
          maxLevel={maxLevel}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border p-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          <Label htmlFor="ph-filter-mobile" className="cursor-pointer">
            {t("battlePanel.filters.honorPoints")}
          </Label>
        </div>
        <Checkbox
          id="ph-filter-mobile"
          checked={ph === true}
          onCheckedChange={(checked) => onPhChange(checked === true)}
        />
      </div>
    </MobileFiltersDrawer>
  );
};
