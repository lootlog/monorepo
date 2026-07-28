import { useId, useState } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Separator } from "@lootlog/ui/components/separator";
import { Card } from "@lootlog/ui/components/card";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Globe,
  Medal,
  Users,
  User,
  Award,
  Swords,
  Check,
  ChevronsUpDown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { useBattlesControllerGetUserWorlds } from "@lootlog/api-client/react-query/battlelog/battles";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { BattleFilters } from "./battles-list-filters";
import { useTranslation } from "react-i18next";

type FiltersSidebarProps = {
  filters: BattleFilters;
  onFiltersChange: (filters: BattleFilters) => void;
  characters?: Array<{ id: string; name: string; world: string }>;
  className?: string;
  showMatchmakingFilter?: boolean;
};

export const FiltersSidebar = ({
  filters,
  onFiltersChange,
  characters = [],
  className,
  showMatchmakingFilter = true,
}: FiltersSidebarProps) => {
  const { t } = useTranslation();
  const characterListId = useId();
  const [characterOpen, setCharacterOpen] = useState(false);

  const { data: worldsResponse } = useBattlesControllerGetUserWorlds();
  const worlds = worldsResponse?.worlds ?? [];
  const battleTypes = [
    { value: "solo" as const, label: t("battlePanel.filters.types.solo") },
    { value: "group" as const, label: t("battlePanel.filters.types.group") },
  ];
  const battleResults = [
    { value: "won" as const, label: t("battlePanel.filters.results.won") },
    { value: "lost" as const, label: t("battlePanel.filters.results.lost") },
    { value: "flee" as const, label: t("battlePanel.filters.results.flee") },
  ];

  const handleCharacterChange = (value: string) => {
    const currentCharacters = filters.characterId ?? [];
    const newCharacters = currentCharacters.includes(value)
      ? currentCharacters.filter((id) => id !== value)
      : [...currentCharacters, value];

    onFiltersChange({
      ...filters,
      characterId: newCharacters.length > 0 ? newCharacters : undefined,
    });
  };

  const handleTypeChange = (value: "solo" | "group") => {
    const currentTypes = filters.type ?? [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter((t) => t !== value)
      : [...currentTypes, value];

    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleResultChange = (value: "won" | "lost" | "flee") => {
    const currentResults = filters.result ?? [];
    const newResults = currentResults.includes(value)
      ? currentResults.filter((r) => r !== value)
      : [...currentResults, value];

    onFiltersChange({
      ...filters,
      result: newResults.length > 0 ? newResults : undefined,
    });
  };

  const handlePhToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      ph: checked ? true : undefined,
    });
  };

  const handleMatchmakingToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      matchmaking: checked ? true : undefined,
    });
  };

  const handleWorldChange = (value: string) => {
    onFiltersChange({
      ...filters,
      world: filters.world === value ? undefined : value,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    onFiltersChange({
      ...filters,
      minLevel: value,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    onFiltersChange({
      ...filters,
      maxLevel: value,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    !!filters.world ||
    (filters.type?.length ?? 0) > 0 ||
    (filters.result?.length ?? 0) > 0 ||
    !!filters.ph ||
    (showMatchmakingFilter && !!filters.matchmaking) ||
    (filters.characterId?.length ?? 0) > 0 ||
    !!filters.search ||
    (filters.minLevel !== undefined && filters.minLevel !== 1) ||
    (filters.maxLevel !== undefined && filters.maxLevel !== 500);

  return (
    <div
      className={cn(
        "w-[320px] h-full flex flex-col shrink-0 bg-background py-3 pr-3",
        className,
      )}
    >
      <Card className="flex-1 flex flex-col min-h-0 bg-filters-sidebar border-border  p-0">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("battlePanel.filters.world")}
                </Label>
                <FilterPopover
                  options={worlds.map((world) => ({
                    value: world,
                    label: capitalizeFirstLetter(world),
                  }))}
                  value={filters.world}
                  onValueChange={handleWorldChange}
                  placeholder={t("battlePanel.filters.world")}
                  icon={Globe}
                  width="w-full"
                  searchPlaceholder={t(
                    "battlePanel.filters.worldSearchPlaceholder",
                  )}
                  emptyMessage={t("battlePanel.filters.noWorlds")}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("battlePanel.filters.battleResult")}
                </Label>
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
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("battlePanel.filters.character")}
                </Label>
                <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-controls={characterListId}
                      aria-expanded={characterOpen}
                      className="w-full justify-between h-10"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm">
                          {filters.characterId && filters.characterId.length > 0
                            ? t("battlePanel.filters.selectedCount", {
                                count: filters.characterId.length,
                              })
                            : t("battlePanel.filters.character")}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command>
                      <CommandInput
                        placeholder={t(
                          "battlePanel.filters.characterSearchPlaceholder",
                        )}
                      />
                      <CommandList id={characterListId}>
                        <CommandEmpty>
                          {t("battlePanel.filters.noCharacters")}
                        </CommandEmpty>
                        <CommandGroup>
                          {characters.map((char) => (
                            <CommandItem
                              key={char.id}
                              value={`${char.name} ${char.world}`}
                              onSelect={() => handleCharacterChange(char.id)}
                              className="p-0 px-2 gap-0"
                            >
                              <PlayerTile
                                player={char}
                                cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                                className="scale-70 mr-2"
                              />
                              {char.name} ({char.world})
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  filters.characterId?.includes(char.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("battlePanel.filters.battleType")}
                </Label>
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
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <Checkbox
                  id="sidebar-ph-checkbox"
                  checked={filters.ph === true}
                  onCheckedChange={handlePhToggle}
                />
                <Label
                  htmlFor="sidebar-ph-checkbox"
                  className="cursor-pointer text-sm"
                >
                  {t("battlePanel.filters.honorPoints")}
                </Label>
              </div>

              {showMatchmakingFilter && (
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  <Checkbox
                    id="sidebar-matchmaking-checkbox"
                    checked={filters.matchmaking === true}
                    onCheckedChange={handleMatchmakingToggle}
                  />
                  <Label
                    htmlFor="sidebar-matchmaking-checkbox"
                    className="cursor-pointer text-sm"
                  >
                    {t("battlePanel.filters.matchmaking")}
                  </Label>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("battlePanel.filters.levelRange")}
                </Label>
                <div className="flex items-center gap-2">
                  <LevelRangeFilter
                    minLevel={filters.minLevel}
                    maxLevel={filters.maxLevel}
                    onMinLevelChange={handleMinLevelChange}
                    onMaxLevelChange={handleMaxLevelChange}
                    inputClassName="w-full"
                    containerClassName="flex-1"
                    separator=<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              layout
              initial={{ opacity: 0, scaleY: 0.96 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.96 }}
              style={{ transformOrigin: "bottom" }}
              className="border-t border-border px-4 overflow-hidden"
            >
              <div className="h-14 flex items-center w-full">
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("loots.filtersPanel.quickFilters.clearButton")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
