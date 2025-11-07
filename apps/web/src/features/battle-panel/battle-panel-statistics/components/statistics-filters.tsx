import { Check, ChevronsUpDown, Calendar, User, Globe } from "lucide-react";
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
import { useState } from "react";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useBattleWorlds } from "@/hooks/api/battle-log/use-battle-worlds";
import { PlayerTile } from "@/components/battle";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";

interface StatisticsFiltersProps {
  characterId?: string;
  world?: string;
  period: Period;
  onCharacterChange: (characterId: string | undefined) => void;
  onWorldChange: (world: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
}

const periods: Array<{ value: Period; label: string }> = [
  { value: "24h", label: "Ostatnie 24 godziny" },
  { value: "3d", label: "Ostatnie 3 dni" },
  { value: "7d", label: "Ostatni tydzień" },
  { value: "14d", label: "Ostatnie 2 tygodnie" },
  { value: "30d", label: "Ostatni miesiąc" },
  { value: "90d", label: "Ostatnie 3 miesiące" },
  { value: "180d", label: "Ostatnie pół roku" },
  { value: "all", label: "Cały czas" },
];

export function StatisticsFilters({
  characterId,
  world,
  period,
  onCharacterChange,
  onWorldChange,
  onPeriodChange,
}: StatisticsFiltersProps) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const { data: characters } = useBattleCharacters();
  const { data: worlds } = useBattleWorlds();

  const selectedCharacter = characters?.find((c) => c.id === characterId);
  const selectedPeriod = periods.find((p) => p.value === period);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={characterOpen}
            className="justify-between"
          >
            {selectedCharacter ? (
              <div className="flex items-center gap-2">
                <PlayerTile
                  player={{
                    name: selectedCharacter.name,
                    icon: selectedCharacter.icon,
                  }}
                  className="scale-75"
                />
                <span>{selectedCharacter.name}</span>
              </div>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Wszystkie postacie
              </>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Szukaj postaci..." />
            <CommandList>
              <CommandEmpty>Nie znaleziono postaci.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-characters"
                  onSelect={() => {
                    onCharacterChange(undefined);
                    setCharacterOpen(false);
                  }}
                  className="flex justify-between"
                >
                  <span>Wszystkie postacie</span>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !characterId ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
                {characters?.map((character) => (
                  <CommandItem
                    key={character.id}
                    value={character.name}
                    onSelect={() => {
                      onCharacterChange(character.id);
                      setCharacterOpen(false);
                    }}
                    className="p-0 flex justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <PlayerTile
                        player={{
                          name: character.name,
                          icon: character.icon,
                        }}
                        className="scale-75"
                      />
                      <span>{character.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({character.world})
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        characterId === character.id
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

      <Popover open={worldOpen} onOpenChange={setWorldOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={worldOpen}
            className="justify-between"
          >
            <Globe className="mr-2 h-4 w-4" />
            {world || "Wszystkie światy"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value="all-worlds"
                  onSelect={() => {
                    onWorldChange(undefined);
                    setWorldOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !world ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Wszystkie światy
                </CommandItem>
                {worlds?.worlds.map((w) => (
                  <CommandItem
                    key={w}
                    value={w}
                    onSelect={() => {
                      onWorldChange(w);
                      setWorldOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        world === w ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {w}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={periodOpen}
            className="justify-between"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedPeriod?.label || "Wybierz okres"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {periods.map((p) => (
                  <CommandItem
                    key={p.value}
                    value={p.value}
                    onSelect={() => {
                      onPeriodChange(p.value);
                      setPeriodOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        period === p.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {p.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
