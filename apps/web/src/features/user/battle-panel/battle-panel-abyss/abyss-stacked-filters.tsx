import { CharacterSelector } from "@/components/filters/character-selector";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { useTranslation } from "react-i18next";
import type { AbyssFiltersProps } from "./abyss-filter-toolbar";
import { AbyssSeasonFilter } from "./abyss-season-filter";

/** The Abyss hub filters stacked for the panel narrow pages open. */
export const AbyssStackedFilters = ({
  characterId,
  onCharacterChange,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  ...seasonFilter
}: AbyssFiltersProps) => {
  const { t } = useTranslation();

  return (
    <>
      <FilterPanelField label={t("battlePanel.filters.character")}>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters={false}
          className="w-full"
        />
      </FilterPanelField>

      <FilterPanelField label={t("battlePanel.abyss.season")}>
        <AbyssSeasonFilter {...seasonFilter} width="w-full" />
      </FilterPanelField>

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
