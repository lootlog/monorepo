import { useEffect, useId, useState } from "react";
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
import { cn } from "cn";
import { CharacterAvatar } from "@/components/filters/character-avatar";
import {
  getBattlesControllerSearchWarriorsQueryKey,
  useBattlesControllerSearchWarriors,
} from "@lootlog/client/battlelog";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type WarriorSearchFilterProps = {
  selectedWarriors: SearchWarrior[];
  onWarriorToggle: (warrior: SearchWarrior) => void;
  placeholder?: string;
  className?: string;
};

export const WarriorSearchFilter = ({
  selectedWarriors,
  onWarriorToggle,
  placeholder,
  className,
}: WarriorSearchFilterProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const resultsListId = useId();
  const { t } = useTranslation();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const { data: searchResponse, isFetching } =
    useBattlesControllerSearchWarriors(
      { q: debouncedQuery },
      {
        query: {
          enabled: debouncedQuery.length >= 2,
          queryKey: getBattlesControllerSearchWarriorsQueryKey({
            q: debouncedQuery,
          }),
        },
      },
    );

  const searchResults = searchResponse?.warriors ?? [];
  const [selectedWarrior] = selectedWarriors;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-controls={resultsListId}
            aria-expanded={open}
            className={cn(
              "h-10 min-w-[200px] flex-1 justify-between gap-2 px-2",
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Search className="size-4" aria-hidden="true" />
              </span>
              {/* Selected warriors are restored from the URL by name only, so
                  the trigger has no sprite, level or profession to show. */}
              <span className="truncate">
                {selectedWarriors.length > 1
                  ? t("ui.warriorSearch.selectedCount", {
                      count: selectedWarriors.length,
                    })
                  : (selectedWarrior?.name ??
                    placeholder ??
                    t("ui.warriorSearch.defaultPlaceholder"))}
              </span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("ui.warriorSearch.inputPlaceholder")}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList id={resultsListId}>
            <CommandEmpty>
              {isFetching
                ? t("ui.warriorSearch.searching")
                : searchQuery.length < 2
                  ? t("ui.warriorSearch.typeAtLeastTwoCharacters")
                  : t("ui.warriorSearch.empty")}
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
                    className="gap-2"
                  >
                    <CharacterAvatar icon={warrior.icon} />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium">
                        {warrior.name}
                      </span>
                      <span className="text-xs tabular-nums opacity-70">
                        {warrior.lvl}
                        {warrior.prof}
                      </span>
                    </span>
                    <Check
                      className={cn(
                        "ml-auto size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
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
