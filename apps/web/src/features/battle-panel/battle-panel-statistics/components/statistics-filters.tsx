import { Check, ChevronsUpDown, Calendar, Shield } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { CharacterSelector } from "./character-selector";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";

interface StatisticsFiltersProps {
  characterId?: string;
  period: Period;
  sameLevelOnly: boolean;
  onCharacterChange: (characterId: string | undefined) => void;
  onPeriodChange: (period: Period) => void;
  onSameLevelOnlyChange: (sameLevelOnly: boolean) => void;
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
  sameLevelOnly,
  onCharacterChange,
  onPeriodChange,
  onSameLevelOnlyChange,
}: StatisticsFiltersProps) {
  const [periodOpen, setPeriodOpen] = useState(false);

  const selectedPeriod = periods.find((p) => p.value === period);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6 flex-wrap">
      <CharacterSelector
        characterId={characterId}
        onCharacterChange={onCharacterChange}
        allowAllCharacters
        size="default"
      />

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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => onSameLevelOnlyChange(!sameLevelOnly)}
              className={cn(
                "justify-between gap-2",
                sameLevelOnly && "border-primary",
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Walki na tym samym poziomie</span>
              </div>
              <div
                className={cn(
                  "h-4 w-4 rounded-sm border border-primary ring-offset-background",
                  sameLevelOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-background",
                )}
              >
                {sameLevelOnly && (
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>1v1 - według wzoru na punkty honoru</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
