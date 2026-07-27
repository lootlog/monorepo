import { PlayerTile } from "@/components/battle";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Award,
  Check,
  ChevronsUpDown,
  Filter,
  Globe,
  Medal,
  SlidersHorizontal,
  Swords,
  User,
  Users,
} from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BattleFilters } from "./battles-list-filters";

type BattlesListFilterToolbarProps = {
  characters: Array<{ id: string; name: string; world: string }>;
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
  characters,
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
  const characterListId = useId();
  const [characterOpen, setCharacterOpen] = useState(false);
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

  let characterLabel = t("battlePanel.filters.character");

  if (filters.characterId && filters.characterId.length > 0) {
    characterLabel = t("battlePanel.filters.selectedCount", {
      count: filters.characterId.length,
    });
  }

  if (isMobile) {
    return (
      <div className="flex min-w-0 items-center gap-2">
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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <WarriorSearchFilter
        selectedWarriors={selectedWarriors}
        onWarriorToggle={onWarriorToggle}
        className="min-w-[260px] flex-1 xl:max-w-[360px]"
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

      <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-controls={characterListId}
            aria-expanded={characterOpen}
            className="h-10 w-[160px] justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <User className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate text-sm">{characterLabel}</span>
            </div>
            <ChevronsUpDown
              className="ml-2 size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput
              placeholder={t("battlePanel.filters.characterSearchPlaceholder")}
            />
            <CommandList id={characterListId}>
              <CommandEmpty>
                {t("battlePanel.filters.noCharacters")}
              </CommandEmpty>
              <CommandGroup>
                {characters.map((character) => (
                  <CommandItem
                    key={character.id}
                    value={`${character.name} ${character.world}`}
                    onSelect={() => onCharacterChange(character.id)}
                    className="gap-0 px-2 py-0"
                  >
                    <PlayerTile
                      player={character}
                      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                      className="mr-2 scale-70"
                    />
                    <span className="truncate">
                      {character.name} ({character.world})
                    </span>
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        filters.characterId?.includes(character.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {moreLabel}
          </Button>
        </PopoverTrigger>
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
            <div className="flex items-center justify-between rounded-md border border-border/70 bg-background p-3">
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
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-background p-3">
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
