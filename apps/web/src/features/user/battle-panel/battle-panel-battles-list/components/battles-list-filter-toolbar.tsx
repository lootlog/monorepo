import { CharacterSelector } from "@/components/filters/character-selector";
import { MoreFiltersPopover } from "@/components/filters/more-filters-popover";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { upperFirst } from "es-toolkit";
import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Filter, Globe, Medal, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BattleFilters } from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";

type BattlesListFilterToolbarProps = {
  filters: BattleFilters;
  isMobile: boolean;
  onCharacterChange: (value: string) => void;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  onMobileFiltersOpen: () => void;
  onPhToggle: (checked: boolean) => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onTypeChange: (value: "solo" | "group") => void;
  onWarriorToggle: (warrior: Warrior) => void;
  onWorldChange: (value: string) => void;
  selectedWarriors: Warrior[];
  worlds: string[];
};

export const BattlesListFilterToolbar = ({
  filters,
  isMobile,
  onCharacterChange,
  onMinLevelChange,
  onMaxLevelChange,
  onMobileFiltersOpen,
  onPhToggle,
  onResultChange,
  onTypeChange,
  onWarriorToggle,
  onWorldChange,
  selectedWarriors,
  worlds,
}: BattlesListFilterToolbarProps) => {
  const { t } = useTranslation();

  const battleTypes = [
    { value: "solo" as const, label: t("battlePanel.filters.types.solo") },
    { value: "group" as const, label: t("battlePanel.filters.types.group") },
  ];

  const battleResults = [
    { value: "won" as const, label: t("battlePanel.filters.results.won") },
    { value: "lost" as const, label: t("battlePanel.filters.results.lost") },
    { value: "flee" as const, label: t("battlePanel.filters.results.flee") },
  ];

  if (isMobile) {
    return (
      <div className="flex w-full min-w-0 items-center gap-2">
        <WarriorSearchFilter
          selectedWarriors={selectedWarriors}
          onWarriorToggle={onWarriorToggle}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          onClick={onMobileFiltersOpen}
        >
          <Filter className="size-4" aria-hidden="true" />
          {t("battlePanel.filters.title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <WarriorSearchFilter
        selectedWarriors={selectedWarriors}
        onWarriorToggle={onWarriorToggle}
        className="min-w-0 basis-full xl:min-w-60 xl:flex-1 xl:basis-0"
      />

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
        width="w-[160px]"
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
        size="default"
        className="h-10 w-[220px]"
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
    </div>
  );
};
