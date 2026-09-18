import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Award,
  Filter,
  Globe,
  Medal,
  SlidersHorizontal,
  Swords,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BattleFilters } from "@/features/user/battle-panel/battle-panel-battles-list/utils/battle-filter-handlers";

type BattlesListFilterToolbarProps = {
  filters: BattleFilters;
  isMobile: boolean;
  onCharacterChange: (value: string) => void;
  onMatchmakingToggle: (checked: boolean) => void;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  onMobileFiltersOpen: () => void;
  onPhToggle: (checked: boolean) => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onTypeChange: (value: "solo" | "group") => void;
  onWarriorToggle: (warrior: Warrior) => void;
  onWorldChange: (value: string) => void;
  selectedWarriors: Warrior[];
  showMatchmakingFilter?: boolean;
  worlds: string[];
};

export const BattlesListFilterToolbar = ({
  filters,
  isMobile,
  onCharacterChange,
  onMatchmakingToggle,
  onMinLevelChange,
  onMaxLevelChange,
  onMobileFiltersOpen,
  onPhToggle,
  onResultChange,
  onTypeChange,
  onWarriorToggle,
  onWorldChange,
  selectedWarriors,
  showMatchmakingFilter = true,
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

  const extraFiltersCount =
    (filters.ph ? 1 : 0) +
    (showMatchmakingFilter && filters.matchmaking ? 1 : 0) +
    ((filters.minLevel ?? 1) !== 1 || (filters.maxLevel ?? 500) !== 500
      ? 1
      : 0);

  let moreLabel = t("battlePanel.filters.more");

  if (extraFiltersCount > 0) {
    moreLabel = t("battlePanel.filters.moreWithCount", {
      count: extraFiltersCount,
    });
  }

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
          label: capitalizeFirstLetter(world),
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

      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" className="h-10 gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {moreLabel}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-[300px] p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                {t("battlePanel.filters.levelRange")}
              </Label>
              <div className="flex items-center gap-2">
                <LevelRangeFilter
                  minLevel={filters.minLevel}
                  maxLevel={filters.maxLevel}
                  onMinLevelChange={onMinLevelChange}
                  onMaxLevelChange={onMaxLevelChange}
                  inputClassName="w-full"
                  containerClassName="flex-1"
                  separator={
                    <span className="text-xs text-muted-foreground">-</span>
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
              <div className="flex items-center gap-2">
                <Award className="size-4" aria-hidden="true" />
                <Label htmlFor="battles-toolbar-ph" className="cursor-pointer">
                  {t("battlePanel.filters.honorPoints")}
                </Label>
              </div>
              <Checkbox
                id="battles-toolbar-ph"
                checked={filters.ph === true}
                onCheckedChange={(checked) => onPhToggle(checked === true)}
              />
            </div>
            {showMatchmakingFilter && (
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
                <div className="flex items-center gap-2">
                  <Swords className="size-4" aria-hidden="true" />
                  <Label
                    htmlFor="battles-toolbar-matchmaking"
                    className="cursor-pointer"
                  >
                    {t("battlePanel.filters.matchmaking")}
                  </Label>
                </div>
                <Checkbox
                  id="battles-toolbar-matchmaking"
                  checked={filters.matchmaking === true}
                  onCheckedChange={(checked) =>
                    onMatchmakingToggle(checked === true)
                  }
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
