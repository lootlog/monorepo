import { CharacterSelector } from "@/components/filters/character-selector";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Filter, TrendingUp, Award } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Input } from "@lootlog/ui/components/input";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useTranslation } from "react-i18next";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";

type StatisticsFiltersMobileProps = {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  ph?: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
};

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
}: StatisticsFiltersMobileProps) => {
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
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder={t("battlePanel.filters.minPlaceholder")}
              value={minLevel ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onMinLevelChange(value ? Number(value) : undefined);
              }}
              min={1}
              max={500}
              className="w-full"
            />
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              type="number"
              placeholder={t("battlePanel.filters.maxPlaceholder")}
              value={maxLevel ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onMaxLevelChange(value ? Number(value) : undefined);
              }}
              min={1}
              max={500}
              className="w-full"
            />
          </div>
        </div>
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
