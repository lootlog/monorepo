import { BattleCharacterFilter } from "./battle-character-filter";

import { Users, Medal, Award, Globe, Swords } from "lucide-react";

import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";

import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import type { BattleFilters } from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type BattlesListFiltersDesktopProps = {
  filters: BattleFilters;
  characterOpen: boolean;
  selectedWarriors: Warrior[];
  worlds: string[];
  characters: Array<{ id: string; name: string; world: string }>;
  onCharacterOpenChange: (open: boolean) => void;
  onCharacterChange: (value: string) => void;
  onTypeChange: (value: "solo" | "group") => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onWarriorToggle: (warrior: Warrior) => void;
  onPhToggle: (checked: boolean) => void;
  onMatchmakingToggle: (checked: boolean) => void;
  onWorldChange: (value: string) => void;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
};

export const BattlesListFiltersDesktop = ({
  filters,
  characterOpen,
  selectedWarriors,
  worlds,
  characters,
  onCharacterOpenChange,
  onCharacterChange,
  onTypeChange,
  onResultChange,
  onWarriorToggle,
  onPhToggle,
  onMatchmakingToggle,
  onWorldChange,
  onMinLevelChange,
  onMaxLevelChange,
}: BattlesListFiltersDesktopProps) => {
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

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <WarriorSearchFilter
        selectedWarriors={selectedWarriors}
        onWarriorToggle={onWarriorToggle}
      />

      <FilterPopover
        options={worlds.map((world) => ({
          value: world,
          label: capitalizeFirstLetter(world),
        }))}
        value={filters.world}
        onValueChange={onWorldChange}
        placeholder={t("battlePanel.filters.world")}
        icon={Globe}
        width="w-[160px]"
        searchPlaceholder={t("battlePanel.filters.worldSearchPlaceholder")}
        emptyMessage={t("battlePanel.filters.noWorlds")}
      />

      <FilterPopover
        options={battleResults}
        value={filters.result}
        onValueChange={onResultChange}
        placeholder={t("battlePanel.filters.battleResult")}
        icon={Medal}
        width="w-[180px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0
            ? t("battlePanel.filters.selectedCount", { count })
            : t("battlePanel.filters.battleResult")
        }
      />

      <BattleCharacterFilter
        selectedIds={filters.characterId}
        characters={characters}
        open={characterOpen}
        onOpenChange={onCharacterOpenChange}
        onChange={onCharacterChange}
        showLabel={false}
        placeholder={t("battlePanel.filters.character")}
        className="w-[180px]"
        triggerClassName="h-10"
      />

      <FilterPopover
        options={battleTypes}
        value={filters.type}
        onValueChange={onTypeChange}
        placeholder={t("battlePanel.filters.battleType")}
        icon={Users}
        width="w-[200px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0
            ? t("battlePanel.filters.selectedCount", { count })
            : t("battlePanel.filters.battleType")
        }
      />

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Award className="h-4 w-4" />
        <Label htmlFor="ph-checkbox" className="cursor-pointer text-sm">
          {t("battlePanel.filters.honorPoints")}
        </Label>
        <Checkbox
          id="ph-checkbox"
          checked={filters.ph === true}
          onCheckedChange={onPhToggle}
        />
      </div>

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Swords className="h-4 w-4" />
        <Label
          htmlFor="matchmaking-checkbox"
          className="cursor-pointer text-sm"
        >
          {t("battlePanel.filters.matchmaking")}
        </Label>
        <Checkbox
          id="matchmaking-checkbox"
          checked={filters.matchmaking === true}
          onCheckedChange={onMatchmakingToggle}
        />
      </div>

      <LevelRangeFilter
        minLevel={filters.minLevel}
        maxLevel={filters.maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
      />
    </div>
  );
};
