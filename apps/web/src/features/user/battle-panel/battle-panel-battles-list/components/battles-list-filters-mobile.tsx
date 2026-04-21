import {
  Users,
  Medal,
  User,
  Award,
  Check,
  ChevronsUpDown,
  Globe,
  Filter,
  Swords,
} from "lucide-react";
import { useId } from "react";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Button } from "@lootlog/ui/components/button";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { cn } from "@lootlog/ui/lib/utils";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { Badge } from "@lootlog/ui/components/badge";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import type { BattleFilters } from "./battles-list-filters";
import { WarriorSearchFilter } from "@/components/filters";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type BattlesListFiltersMobileProps = {
  filters: BattleFilters;
  activeFiltersCount: number;
  typeOpen: boolean;
  resultOpen: boolean;
  characterOpen: boolean;
  worldOpen: boolean;
  selectedWarriors: Warrior[];
  worlds: string[];
  characters: Array<{ id: string; name: string; world: string }>;
  onTypeOpenChange: (open: boolean) => void;
  onResultOpenChange: (open: boolean) => void;
  onCharacterOpenChange: (open: boolean) => void;
  onWorldOpenChange: (open: boolean) => void;
  onCharacterChange: (value: string) => void;
  onTypeChange: (value: "solo" | "group") => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onWarriorToggle: (warrior: Warrior) => void;
  onPhToggle: (checked: boolean) => void;
  onMatchmakingToggle: (checked: boolean) => void;
  onWorldChange: (value: string) => void;
};

export const BattlesListFiltersMobile = ({
  filters,
  activeFiltersCount,
  typeOpen,
  resultOpen,
  characterOpen,
  worldOpen,
  selectedWarriors,
  worlds,
  characters,
  onTypeOpenChange,
  onResultOpenChange,
  onCharacterOpenChange,
  onWorldOpenChange,
  onCharacterChange,
  onTypeChange,
  onResultChange,
  onWarriorToggle,
  onPhToggle,
  onMatchmakingToggle,
  onWorldChange,
}: BattlesListFiltersMobileProps) => {
  const { t } = useTranslation();
  const worldListId = useId();
  const resultListId = useId();
  const characterListId = useId();
  const typeListId = useId();
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
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>{t("battlePanel.filters.title")}</span>
          </div>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="mb-4">
          <DrawerTitle>{t("battlePanel.filters.battlesTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>{t("battlePanel.filters.searchWarriors")}</Label>
            <WarriorSearchFilter
              selectedWarriors={selectedWarriors}
              onWarriorToggle={onWarriorToggle}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("battlePanel.filters.world")}</Label>
            <Popover
              open={worldOpen}
              onOpenChange={onWorldOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-controls={worldListId}
                  aria-expanded={worldOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.world
                        ? capitalizeFirstLetter(filters.world)
                        : t("battlePanel.filters.allWorlds")}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                }}
              >
                <Command>
                  <CommandInput
                    placeholder={t(
                      "battlePanel.filters.worldSearchPlaceholder",
                    )}
                  />
                  <CommandList id={worldListId}>
                    <CommandEmpty>
                      {t("battlePanel.filters.noWorlds")}
                    </CommandEmpty>
                    <CommandGroup>
                      {worlds.map((world) => (
                        <CommandItem
                          key={world}
                          value={world}
                          onSelect={() => onWorldChange(world)}
                        >
                          {capitalizeFirstLetter(world)}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              filters.world === world
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

          <div className="space-y-2">
            <Label>{t("battlePanel.filters.battleResult")}</Label>
            <Popover
              open={resultOpen}
              onOpenChange={onResultOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-controls={resultListId}
                  aria-expanded={resultOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.result && filters.result.length > 0
                        ? t("battlePanel.filters.selectedCount", {
                            count: filters.result.length,
                          })
                        : t("battlePanel.filters.allResults")}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList id={resultListId}>
                    <CommandEmpty>
                      {t("battlePanel.filters.noOptions")}
                    </CommandEmpty>
                    <CommandGroup>
                      {battleResults.map((result) => (
                        <CommandItem
                          key={result.value}
                          value={result.value}
                          onSelect={() => onResultChange(result.value)}
                        >
                          {result.label}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              filters.result?.includes(result.value)
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

          <div className="space-y-2">
            <Label>{t("battlePanel.filters.character")}</Label>
            <Popover
              open={characterOpen}
              onOpenChange={onCharacterOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-controls={characterListId}
                  aria-expanded={characterOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.characterId && filters.characterId.length > 0
                        ? t("battlePanel.filters.selectedCount", {
                            count: filters.characterId.length,
                          })
                        : t("battlePanel.filters.allCharacters")}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
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
                          onSelect={() => onCharacterChange(char.id)}
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

          <div className="space-y-2">
            <Label>{t("battlePanel.filters.battleType")}</Label>
            <Popover
              open={typeOpen}
              onOpenChange={onTypeOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-controls={typeListId}
                  aria-expanded={typeOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.type && filters.type.length > 0
                        ? t("battlePanel.filters.selectedCount", {
                            count: filters.type.length,
                          })
                        : t("battlePanel.filters.allTypes")}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList id={typeListId}>
                    <CommandEmpty>
                      {t("battlePanel.filters.noOptions")}
                    </CommandEmpty>
                    <CommandGroup>
                      {battleTypes.map((type) => (
                        <CommandItem
                          key={type.value}
                          value={type.value}
                          onSelect={() => onTypeChange(type.value)}
                        >
                          {type.label}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              filters.type?.includes(type.value)
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

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <Label htmlFor="ph-checkbox-mobile" className="cursor-pointer">
                {t("battlePanel.filters.honorPoints")}
              </Label>
            </div>
            <Checkbox
              id="ph-checkbox-mobile"
              checked={filters.ph === true}
              onCheckedChange={onPhToggle}
            />
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              <Label
                htmlFor="matchmaking-checkbox-mobile"
                className="cursor-pointer"
              >
                {t("battlePanel.filters.matchmaking")}
              </Label>
            </div>
            <Checkbox
              id="matchmaking-checkbox-mobile"
              checked={filters.matchmaking === true}
              onCheckedChange={onMatchmakingToggle}
            />
          </div>
        </div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              {t("battlePanel.actions.close")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
