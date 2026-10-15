import { getBattleFilterOptions } from "../utils/battle-filter-options";
import { CharacterSelector } from "@/components/filters/character-selector";
import { MoreFiltersPopover } from "@/components/filters/more-filters-popover";
import { upperFirst } from "es-toolkit";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Globe, Medal, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BattleFilters } from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";

type BattlesListFilterToolbarProps = {
  filters: BattleFilters;
  onCharacterChange: (value: string) => void;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  onPhToggle: (checked: boolean) => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onTypeChange: (value: "solo" | "group") => void;
  onWorldChange: (value: string) => void;
  worlds: string[];
};

/** The battle list filters for the filter bar, after its search. */
export const BattlesListFilterToolbar = ({
  filters,
  onCharacterChange,
  onMinLevelChange,
  onMaxLevelChange,
  onPhToggle,
  onResultChange,
  onTypeChange,
  onWorldChange,
  worlds,
}: BattlesListFilterToolbarProps) => {
  const { t } = useTranslation();

  const { battleTypes, battleResults } = getBattleFilterOptions(t);

  return (
    <>
      <FilterPopover
        options={worlds.map((world) => ({
          value: world,
          label: upperFirst(world),
        }))}
        value={filters.world}
        onValueChange={onWorldChange}
        placeholder={t("battlePanel.filters.world")}
        icon={Globe}
        width="w-[150px]"
        searchPlaceholder={t("battlePanel.filters.worldSearchPlaceholder")}
        emptyMessage={t("battlePanel.filters.noWorlds")}
      />

      <FilterPopover
        options={battleResults}
        value={filters.result}
        onValueChange={onResultChange}
        placeholder={t("battlePanel.filters.battleResultShort")}
        icon={Medal}
        width="w-[150px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) => {
          if (count > 0) {
            return t("battlePanel.filters.selectedCount", { count });
          }

          return t("battlePanel.filters.battleResultShort");
        }}
      />

      <CharacterSelector
        multiple
        characterIds={filters.characterId}
        onCharacterToggle={onCharacterChange}
        className="w-[220px]"
      />

      <FilterPopover
        options={battleTypes}
        value={filters.type}
        onValueChange={onTypeChange}
        placeholder={t("battlePanel.filters.battleTypeShort")}
        icon={Users}
        width="w-[150px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) => {
          if (count > 0) {
            return t("battlePanel.filters.selectedCount", { count });
          }

          return t("battlePanel.filters.battleTypeShort");
        }}
      />

      <MoreFiltersPopover
        minLevel={filters.minLevel}
        maxLevel={filters.maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        ph={filters.ph}
        onPhChange={onPhToggle}
        phCheckboxId="battles-toolbar-ph"
      />
    </>
  );
};
