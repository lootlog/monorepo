import { Check, ChevronsUpDown, Calendar } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { CharacterSelector } from "./character-selector";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";

interface StatisticsFiltersProps {
  characterId?: string;
  period: Period;
  minLevel?: number;
  maxLevel?: number;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
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
  period,
  minLevel,
  maxLevel,
  onCharacterChange,
  onPeriodChange,
  onMinLevelChange,
  onMaxLevelChange,
}: StatisticsFiltersProps) {
  const [periodOpen, setPeriodOpen] = useState(false);

  const selectedPeriod = periods.find((p) => p.value === period);

  const handleMinLevelChange = (value: string) => {
    if (value === "") {
      onMinLevelChange(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        onMinLevelChange(parsed);
      }
    }
  };

  const handleMaxLevelChange = (value: string) => {
    if (value === "") {
      onMaxLevelChange(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        onMaxLevelChange(parsed);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6 flex-wrap items-end">
      <div className="space-y-1">
        <Label className="text-xs invisible">Postać</Label>
        <CharacterSelector
          characterId={characterId}
          onCharacterChange={onCharacterChange}
          allowAllCharacters
          size="default"
          className="h-10"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs invisible">Okres</Label>
        <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={periodOpen}
              className="justify-between h-10"
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

      <div className="space-y-1">
        <Label htmlFor="min-level" className="text-xs">
          Min. poziom przeciwnika
        </Label>
        <Input
          id="min-level"
          type="number"
          min="1"
          max="500"
          value={minLevel ?? ""}
          onChange={(e) => handleMinLevelChange(e.target.value)}
          className="w-[140px] h-10"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="max-level" className="text-xs">
          Max. poziom przeciwnika
        </Label>
        <Input
          id="max-level"
          type="number"
          min="1"
          max="500"
          value={maxLevel ?? ""}
          onChange={(e) => handleMaxLevelChange(e.target.value)}
          className="w-[140px] h-10"
        />
      </div>
    </div>
  );
}
