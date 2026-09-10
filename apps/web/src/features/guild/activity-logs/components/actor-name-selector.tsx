import { useTranslation } from "react-i18next";
import { useId, useState } from "react";
import { Search, X, ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInputRaw,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";

interface ActorNameSelectorProps {
  value: string;
  suggestions: string[];
  onValueChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ActorNameSelector({
  value,
  suggestions,
  onValueChange,
  searchValue,
  onSearchChange,
  placeholder = "Nazwa gracza...",
  className,
}: ActorNameSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const suggestionsListId = useId();

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    onSearchChange(selectedValue);
    setOpen(false);
  };

  const handleClear = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSearchChange("");
    onValueChange("");
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const exactMatch = suggestions.some(
    (s) => s.toLowerCase() === searchValue.trim().toLowerCase(),
  );
  const showCustomOption = searchValue.trim() && !exactMatch;

  const displayValue = value || placeholder;
  const isTruncated = value.length > 30;
  const truncatedValue = isTruncated ? `${value.slice(0, 30)}...` : value;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className={cn("relative", className)}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-controls={suggestionsListId}
              aria-expanded={open}
              className={cn("w-full justify-between gap-2", value && "pr-10")}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn("truncate", !value && "text-muted-foreground")}
                >
                  {value ? truncatedValue : displayValue}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </div>
            </Button>
          }
        />
        {value && (
          <button
            type="button"
            aria-label={t("common.clear")}
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInputRaw
            placeholder="Wpisz nazwę..."
            value={searchValue}
            onChange={handleInputChange}
            className="h-9"
          />
          <CommandList id={suggestionsListId}>
            <CommandEmpty>
              {searchValue.trim() ? "Brak sugestii" : "Wpisz aby wyszukać..."}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {suggestion}
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  value={`use-custom-${searchValue}`}
                  onSelect={() => handleSelect(searchValue.trim())}
                  className="text-primary"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Użyj: {searchValue.trim()}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
