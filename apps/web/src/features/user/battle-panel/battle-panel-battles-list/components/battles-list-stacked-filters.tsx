import { getBattleFilterOptions } from "../utils/battle-filter-options";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import {
  createBattleFilterHandlers,
  type BattleFilters,
} from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Label } from "@lootlog/ui/components/label";
import { Award, Globe, Medal, Users } from "lucide-react";
import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";

type BattlesListStackedFiltersProps = {
  filters: BattleFilters;
  onFiltersChange: (filters: BattleFilters) => void;
  worlds: string[];
};

/** The battle list filters stacked for the panel narrow pages open. */
export const BattlesListStackedFilters = ({
  filters,
  onFiltersChange,
  worlds,
}: BattlesListStackedFiltersProps) => {
  const {
    handleTypeChange,
    handleResultChange,
    handlePhToggle,
    handleMinLevelChange,
    handleMaxLevelChange,
    handleWorldChange,
  } = createBattleFilterHandlers(filters, onFiltersChange);

  const { t } = useTranslation();

  const { battleTypes, battleResults } = getBattleFilterOptions(t);

  return (
    <>
      <FilterPanelField label={t("battlePanel.filters.world")}>
        <FilterPopover
          options={worlds.map((world) => ({
            value: world,
            label: upperFirst(world),
          }))}
          value={filters.world}
          onValueChange={handleWorldChange}
          placeholder={t("battlePanel.filters.world")}
          icon={Globe}
          width="w-full"
          searchPlaceholder={t("battlePanel.filters.worldSearchPlaceholder")}
          emptyMessage={t("battlePanel.filters.noWorlds")}
        />
      </FilterPanelField>

      <FilterPanelField label={t("battlePanel.filters.battleResult")}>
        <FilterPopover
          options={battleResults}
          value={filters.result}
          onValueChange={handleResultChange}
          placeholder={t("battlePanel.filters.battleResult")}
          icon={Medal}
          width="w-full"
          multiSelect
          showSearch={false}
          renderTriggerLabel={(count) =>
            count > 0
              ? t("battlePanel.filters.selectedCount", { count })
              : t("battlePanel.filters.battleResult")
          }
        />
      </FilterPanelField>

      <FilterPanelField label={t("battlePanel.filters.battleType")}>
        <FilterPopover
          options={battleTypes}
          value={filters.type}
          onValueChange={handleTypeChange}
          placeholder={t("battlePanel.filters.battleType")}
          icon={Users}
          width="w-full"
          multiSelect
          showSearch={false}
          renderTriggerLabel={(count) =>
            count > 0
              ? t("battlePanel.filters.selectedCount", { count })
              : t("battlePanel.filters.battleType")
          }
        />
      </FilterPanelField>

      <FilterPanelField>
        <div className="flex items-center gap-2">
          <Award className="size-4" aria-hidden="true" />
          <Checkbox
            id="battles-panel-ph-checkbox"
            checked={filters.ph === true}
            onCheckedChange={handlePhToggle}
          />
          <Label
            htmlFor="battles-panel-ph-checkbox"
            className="cursor-pointer text-sm"
          >
            {t("battlePanel.filters.honorPoints")}
          </Label>
        </div>
      </FilterPanelField>

      <FilterPanelField label={t("battlePanel.filters.levelRange")}>
        <LevelRangeFilter
          minLevel={filters.minLevel}
          maxLevel={filters.maxLevel}
          onMinLevelChange={handleMinLevelChange}
          onMaxLevelChange={handleMaxLevelChange}
        />
      </FilterPanelField>
    </>
  );
};
