import {
  Users,
  Medal,
  User,
  Award,
  Check,
  ChevronsUpDown,
  Globe,
  Swords,
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
import { cn } from "@lootlog/ui/lib/utils";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import type { BattleFilters } from "./battles-list-filters";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { LevelRangeFilter, WarriorSearchFilter } from "@/components/filters";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";

const battleTypes = [
  { value: "solo" as const, label: "Solo" },
  { value: "group" as const, label: "Grupowe" },
];

const battleResults = [
  { value: "won" as const, label: "Zwycięstwa" },
  { value: "lost" as const, label: "Porażki" },
  { value: "flee" as const, label: "Ucieczki" },
];

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
        placeholder="Świat"
        icon={Globe}
        width="w-[160px]"
        searchPlaceholder="Szukaj świata..."
        emptyMessage="Brak światów"
      />

      <FilterPopover
        options={battleResults}
        value={filters.result}
        onValueChange={onResultChange}
        placeholder="Wynik"
        icon={Medal}
        width="w-[180px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0 ? `${count} wybranych` : "Wynik"
        }
      />

      <Popover open={characterOpen} onOpenChange={onCharacterOpenChange}>
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

      <FilterPopover
        options={battleTypes}
        value={filters.type}
        onValueChange={onTypeChange}
        placeholder="Typ walki"
        icon={Users}
        width="w-[200px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0 ? `${count} wybranych` : "Typ walki"
        }
      />

      <div className="flex items-center gap-2 border rounded-md px-3 h-10">
        <Award className="h-4 w-4" />
        <Label htmlFor="ph-checkbox" className="cursor-pointer text-sm">
          Punkty Honoru
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
          Otchłań
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
