import {
  Users,
  Medal,
  User,
  Award,
  Check,
  ChevronsUpDown,
  Search,
  Globe,
  Filter,
} from "lucide-react";
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

const battleTypes = [
  { value: "solo" as const, label: "Solo" },
  { value: "group" as const, label: "Grupowe" },
];

const battleResults = [
  { value: "won" as const, label: "Zwycięstwa" },
  { value: "lost" as const, label: "Porażki" },
  { value: "flee" as const, label: "Ucieczki" },
];

type BattlesListFiltersMobileProps = {
  filters: BattleFilters;
  activeFiltersCount: number;
  typeOpen: boolean;
  resultOpen: boolean;
  characterOpen: boolean;
  worldOpen: boolean;
  warriorSearchOpen: boolean;
  warriorSearchQuery: string;
  selectedWarriors: Array<{
    name: string;
    icon: string;
    prof: string;
    lvl: number;
  }>;
  searchResults: Array<{
    name: string;
    icon: string;
    prof: string;
    lvl: number;
  }>;
  isSearching: boolean;
  worlds: string[];
  characters: Array<{ id: string; name: string; world: string }>;
  onTypeOpenChange: (open: boolean) => void;
  onResultOpenChange: (open: boolean) => void;
  onCharacterOpenChange: (open: boolean) => void;
  onWorldOpenChange: (open: boolean) => void;
  onWarriorSearchOpenChange: (open: boolean) => void;
  onWarriorSearchQueryChange: (query: string) => void;
  onCharacterChange: (value: string) => void;
  onTypeChange: (value: "solo" | "group") => void;
  onResultChange: (value: "won" | "lost" | "flee") => void;
  onWarriorToggle: (warrior: {
    name: string;
    icon: string;
    prof: string;
    lvl: number;
  }) => void;
  onPhToggle: (checked: boolean) => void;
  onWorldChange: (value: string) => void;
};

export const BattlesListFiltersMobile = ({
  filters,
  activeFiltersCount,
  typeOpen,
  resultOpen,
  characterOpen,
  worldOpen,
  warriorSearchOpen,
  warriorSearchQuery,
  selectedWarriors,
  searchResults,
  isSearching,
  worlds,
  characters,
  onTypeOpenChange,
  onResultOpenChange,
  onCharacterOpenChange,
  onWorldOpenChange,
  onWarriorSearchOpenChange,
  onWarriorSearchQueryChange,
  onCharacterChange,
  onTypeChange,
  onResultChange,
  onWarriorToggle,
  onPhToggle,
  onWorldChange,
}: BattlesListFiltersMobileProps) => {
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtry</span>
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
          <DrawerTitle>Filtry walk</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Szukaj wojowników</Label>
            <Popover
              open={warriorSearchOpen}
              onOpenChange={onWarriorSearchOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={warriorSearchOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span className="text-sm">
                      {selectedWarriors.length > 0
                        ? `${selectedWarriors.length} wybranych`
                        : "Szukaj wojowników..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Wpisz nazwę wojownika..."
                    value={warriorSearchQuery}
                    onValueChange={onWarriorSearchQueryChange}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isSearching
                        ? "Wyszukiwanie..."
                        : warriorSearchQuery.length < 2
                          ? "Wpisz przynajmniej 2 znaki"
                          : "Nie znaleziono"}
                    </CommandEmpty>
                    <CommandGroup>
                      {searchResults.map((warrior) => {
                        const isSelected = selectedWarriors.some(
                          (w) => w.name === warrior.name,
                        );
                        return (
                          <CommandItem
                            key={warrior.name}
                            value={warrior.name}
                            onSelect={() => onWarriorToggle(warrior)}
                            className="p-0 px-2 gap-0"
                          >
                            <PlayerTile
                              player={warrior}
                              cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                              className="scale-70 mr-2"
                            />
                            <span>
                              {warrior.name} ({warrior.lvl} lvl)
                            </span>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Świat</Label>
            <Popover
              open={worldOpen}
              onOpenChange={onWorldOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={worldOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.world
                        ? capitalizeFirstLetter(filters.world)
                        : "Wszystkie światy"}
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
                  <CommandInput placeholder="Szukaj świata..." />
                  <CommandList>
                    <CommandEmpty>Brak światów</CommandEmpty>
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
            <Label>Wynik walki</Label>
            <Popover
              open={resultOpen}
              onOpenChange={onResultOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={resultOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.result && filters.result.length > 0
                        ? `${filters.result.length} wybranych`
                        : "Wszystkie wyniki"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList>
                    <CommandEmpty>Brak opcji</CommandEmpty>
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
            <Label>Postać</Label>
            <Popover
              open={characterOpen}
              onOpenChange={onCharacterOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={characterOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.characterId && filters.characterId.length > 0
                        ? `${filters.characterId.length} wybranych`
                        : "Wszystkie postacie"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Szukaj postaci..." />
                  <CommandList>
                    <CommandEmpty>Brak postaci</CommandEmpty>
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
            <Label>Typ walki</Label>
            <Popover
              open={typeOpen}
              onOpenChange={onTypeOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      {filters.type && filters.type.length > 0
                        ? `${filters.type.length} wybranych`
                        : "Wszystkie typy"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList>
                    <CommandEmpty>Brak opcji</CommandEmpty>
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
                Punkty Honoru
              </Label>
            </div>
            <Checkbox
              id="ph-checkbox-mobile"
              checked={filters.ph === true}
              onCheckedChange={onPhToggle}
            />
          </div>
        </div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Zamknij
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
