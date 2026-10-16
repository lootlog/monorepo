import { CharacterSelector } from "@/components/filters/character-selector";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { Award } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { StatisticsFiltersProps } from "./statistics-filter-toolbar";

/** The battle statistics filters stacked for the panel narrow pages open. */
export const StatisticsStackedFilters = ({
  characterId,
  onCharacterChange,
  allowAllCharacters = false,
  period,
  onPeriodChange,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  ph,
  onPhChange,
}: StatisticsFiltersProps) => {
  const characters = useBattleCharacters();
  const { t } = useTranslation();
  const phCheckboxId = useId();

  return (
    <>
      {onCharacterChange && (
        <FilterPanelField label={t("battlePanel.filters.character")}>
          <CharacterSelector
            characters={characters}
            characterId={characterId}
            onCharacterChange={onCharacterChange}
            allowAllCharacters={allowAllCharacters}
            className="w-full"
          />
        </FilterPanelField>
      )}

      <FilterPanelField label={t("battlePanel.filters.period")}>
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-full"
        />
      </FilterPanelField>

      {onPhChange && (
        <FilterPanelField>
          <div className="flex items-center gap-2">
            <Award className="size-4" aria-hidden="true" />
            <Checkbox
              id={phCheckboxId}
              checked={ph === true}
              onCheckedChange={(checked) => onPhChange(checked === true)}
            />
            <Label htmlFor={phCheckboxId} className="cursor-pointer text-sm">
              {t("battlePanel.filters.honorPoints")}
            </Label>
          </div>
        </FilterPanelField>
      )}

      <FilterPanelField label={t("battlePanel.filters.levelRange")}>
        <LevelRangeFilter
          minLevel={minLevel}
          maxLevel={maxLevel}
          onMinLevelChange={onMinLevelChange}
          onMaxLevelChange={onMaxLevelChange}
        />
      </FilterPanelField>
    </>
  );
};
