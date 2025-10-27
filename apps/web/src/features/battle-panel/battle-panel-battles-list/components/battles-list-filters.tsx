import {
  Users,
  Medal,
  User,
  Award,
  Check,
  ChevronsUpDown,
  X,
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
import { useState } from "react";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { useSearchWarriors } from "@/hooks/api/battle-log/use-search-warriors";
import { useUserWorlds } from "@/hooks/api/battle-log/use-user-worlds";
import { Badge } from "@lootlog/ui/components/badge";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export type BattleFilters = {
  world?: string;
  type?: Array<"solo" | "group">;
  search?: string;
  result?: Array<"won" | "lost" | "flee">;
  ph?: boolean;
  characterId?: Array<string>;
};

type BattlesListFiltersProps = {
  filters: BattleFilters;
  onFiltersChange: (filters: BattleFilters) => void;
  characters?: Array<{ id: string; name: string; world: string }>;
};

const battleTypes = [
  { value: "solo" as const, label: "Solo" },
  { value: "group" as const, label: "Grupowe" },
];

const battleResults = [
  { value: "won" as const, label: "Zwycięstwa" },
  { value: "lost" as const, label: "Porażki" },
  { value: "flee" as const, label: "Ucieczki" },
];

export const BattlesListFilters = ({
  filters,
  onFiltersChange,
  characters = [],
}: BattlesListFiltersProps) => {
  const [typeOpen, setTypeOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const [warriorSearchOpen, setWarriorSearchOpen] = useState(false);
  const [warriorSearchQuery, setWarriorSearchQuery] = useState("");
  const [selectedWarriors, setSelectedWarriors] = useState<
    Array<{ name: string; icon: string; prof: string; lvl: number }>
  >([]);

  const { data: searchResults = [], isLoading: isSearching } =
    useSearchWarriors(warriorSearchQuery);
  const { data: worlds = [] } = useUserWorlds();

  const handleCharacterChange = (value: string) => {
    const currentCharacters = filters.characterId || [];
    const newCharacters = currentCharacters.includes(value)
      ? currentCharacters.filter((id) => id !== value)
      : [...currentCharacters, value];

    onFiltersChange({
      ...filters,
      characterId: newCharacters.length > 0 ? newCharacters : undefined,
    });
  };

  const handleTypeChange = (value: "solo" | "group") => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter((t) => t !== value)
      : [...currentTypes, value];

    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleResultChange = (value: "won" | "lost" | "flee") => {
    const currentResults = filters.result || [];
    const newResults = currentResults.includes(value)
      ? currentResults.filter((r) => r !== value)
      : [...currentResults, value];

    onFiltersChange({
      ...filters,
      result: newResults.length > 0 ? newResults : undefined,
    });
  };

  const handleWarriorToggle = (warrior: {
    name: string;
    icon: string;
    prof: string;
    lvl: number;
  }) => {
    const isSelected = selectedWarriors.some((w) => w.name === warrior.name);
    let newSelectedWarriors;

    if (isSelected) {
      newSelectedWarriors = selectedWarriors.filter(
        (w) => w.name !== warrior.name,
      );
    } else {
      newSelectedWarriors = [...selectedWarriors, warrior];
    }

    setSelectedWarriors(newSelectedWarriors);

    // Update filters with warrior names
    const warriorNames = newSelectedWarriors.map((w) => w.name);
    onFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const handleRemoveWarrior = (warriorName: string) => {
    const newSelectedWarriors = selectedWarriors.filter(
      (w) => w.name !== warriorName,
    );
    setSelectedWarriors(newSelectedWarriors);

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    onFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
    });
  };

  const handlePhToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      ph: checked ? true : undefined,
    });
  };

  const handleWorldChange = (value: string) => {
    onFiltersChange({
      ...filters,
      world: filters.world === value ? undefined : value,
    });
    setWorldOpen(false);
  };

  const activeFiltersCount =
    (filters.characterId?.length || 0) +
    (filters.type?.length || 0) +
    (filters.result?.length || 0) +
    (filters.world ? 1 : 0) +
    (filters.ph ? 1 : 0) +
    selectedWarriors.length;

  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="md:hidden">
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
                  onOpenChange={setWarriorSearchOpen}
                  modal
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
                        onValueChange={setWarriorSearchQuery}
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
                                onSelect={() => handleWarriorToggle(warrior)}
                                className="p-0 px-2 gap-0"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <PlayerTile
                                  player={warrior}
                                  cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                                  className="scale-70 mr-2"
                                />
                                <span>
                                  {warrior.name} ({warrior.lvl} lvl)
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* World */}
              <div className="space-y-2">
                <Label>Świat</Label>
                <Popover open={worldOpen} onOpenChange={setWorldOpen} modal>
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
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Szukaj świata..." />
                      <CommandList>
                        <CommandEmpty>Brak światów</CommandEmpty>
                        <CommandGroup>
                          {worlds.map((world) => (
                            <CommandItem
                              key={world}
                              value={world}
                              onSelect={() => handleWorldChange(world)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.world === world
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {capitalizeFirstLetter(world)}
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
                <Popover open={resultOpen} onOpenChange={setResultOpen} modal>
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
                              onSelect={() => handleResultChange(result.value)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.result?.includes(result.value)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {result.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Character */}
              <div className="space-y-2">
                <Label>Postać</Label>
                <Popover
                  open={characterOpen}
                  onOpenChange={setCharacterOpen}
                  modal
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
                              onSelect={() => handleCharacterChange(char.id)}
                              className="p-0 px-2 gap-0"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.characterId?.includes(char.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <PlayerTile
                                player={char}
                                cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                                className="scale-70 mr-2"
                              />
                              {char.name} ({char.world})
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
                <Popover open={typeOpen} onOpenChange={setTypeOpen} modal>
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
                              onSelect={() => handleTypeChange(type.value)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.type?.includes(type.value)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {type.label}
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
                  <Label
                    htmlFor="ph-checkbox-mobile"
                    className="cursor-pointer"
                  >
                    Punkty Honoru
                  </Label>
                </div>
                <Checkbox
                  id="ph-checkbox-mobile"
                  checked={filters.ph === true}
                  onCheckedChange={handlePhToggle}
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
      </div>

      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <Popover open={warriorSearchOpen} onOpenChange={setWarriorSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={warriorSearchOpen}
              className="flex-1 min-w-[200px] justify-between h-10"
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
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Wpisz nazwę wojownika..."
                value={warriorSearchQuery}
                onValueChange={setWarriorSearchQuery}
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
                        onSelect={() => handleWarriorToggle(warrior)}
                        className="p-0 px-2 gap-0"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <PlayerTile
                          player={warrior}
                          cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                          className="scale-70 mr-2"
                        />
                        <span>
                          {warrior.name} ({warrior.lvl} lvl)
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={worldOpen} onOpenChange={setWorldOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={worldOpen}
              className="w-[160px] justify-between h-10"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">
                  {filters.world
                    ? capitalizeFirstLetter(filters.world)
                    : "Świat"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-0">
            <Command>
              <CommandInput placeholder="Szukaj świata..." />
              <CommandList>
                <CommandEmpty>Brak światów</CommandEmpty>
                <CommandGroup>
                  {worlds.map((world) => (
                    <CommandItem
                      key={world}
                      value={world}
                      onSelect={() => handleWorldChange(world)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.world === world ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {capitalizeFirstLetter(world)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={resultOpen} onOpenChange={setResultOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={resultOpen}
              className="w-[180px] justify-between h-10"
            >
              <div className="flex items-center gap-2">
                <Medal className="h-4 w-4" />
                <span className="text-sm">
                  {filters.result && filters.result.length > 0
                    ? `${filters.result.length} wybranych`
                    : "Wynik"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0">
            <Command>
              <CommandList>
                <CommandEmpty>Brak opcji</CommandEmpty>
                <CommandGroup>
                  {battleResults.map((result) => (
                    <CommandItem
                      key={result.value}
                      value={result.value}
                      onSelect={() => handleResultChange(result.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.result?.includes(result.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {result.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={characterOpen}
              className="w-[180px] justify-between h-10"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">
                  {filters.characterId && filters.characterId.length > 0
                    ? `${filters.characterId.length} wybranych`
                    : "Postać"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0">
            <Command>
              <CommandInput placeholder="Szukaj postaci..." />
              <CommandList>
                <CommandEmpty>Brak postaci</CommandEmpty>
                <CommandGroup>
                  {characters.map((char) => (
                    <CommandItem
                      key={char.id}
                      value={`${char.name} ${char.world}`}
                      onSelect={() => handleCharacterChange(char.id)}
                      className="p-0 px-2 gap-0"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.characterId?.includes(char.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />{" "}
                      <PlayerTile
                        player={char}
                        cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                        className="scale-70 mr-2"
                      />{" "}
                      {char.name} ({char.world})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={typeOpen} onOpenChange={setTypeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={typeOpen}
              className="w-[200px] justify-between h-10"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  {filters.type && filters.type.length > 0
                    ? `${filters.type.length} wybranych`
                    : "Typ walki"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandList>
                <CommandEmpty>Brak opcji</CommandEmpty>
                <CommandGroup>
                  {battleTypes.map((type) => (
                    <CommandItem
                      key={type.value}
                      value={type.value}
                      onSelect={() => handleTypeChange(type.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.type?.includes(type.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {type.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 border rounded-md px-3 h-10">
          <Award className="h-4 w-4" />
          <Label htmlFor="ph-checkbox" className="cursor-pointer text-sm">
            Punkty Honoru
          </Label>
          <Checkbox
            id="ph-checkbox"
            checked={filters.ph === true}
            onCheckedChange={handlePhToggle}
          />
        </div>
      </div>

      {selectedWarriors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedWarriors.map((warrior) => (
            <Badge
              key={warrior.name}
              variant="secondary"
              className="pl-1 pr-2 py-1 gap-1"
            >
              <PlayerTile
                player={warrior}
                cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                className="scale-50"
              />
              <span className="text-xs">
                {warrior.name} ({warrior.lvl} lvl)
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveWarrior(warrior.name);
                }}
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
