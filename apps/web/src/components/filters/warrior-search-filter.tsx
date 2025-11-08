import { useState } from "react";
import { Search, ChevronsUpDown, Check } from "lucide-react";
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
import {
  useSearchWarriors,
  type Warrior,
} from "@/hooks/api/battle-log/use-search-warriors";

type WarriorSearchFilterProps = {
  selectedWarriors: Warrior[];
  onWarriorToggle: (warrior: Warrior) => void;
  placeholder?: string;
  className?: string;
};

export const WarriorSearchFilter = ({
  selectedWarriors,
  onWarriorToggle,
  placeholder = "Szukaj wojowników...",
  className,
}: WarriorSearchFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults = [], isFetching } =
    useSearchWarriors(searchQuery);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("flex-1 min-w-[200px] justify-between h-10", className)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">
              {selectedWarriors.length > 0
                ? `${selectedWarriors.length} wybranych`
                : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Wpisz nazwę wojownika..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isFetching
                ? "Wyszukiwanie..."
                : searchQuery.length < 2
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
  );
};
