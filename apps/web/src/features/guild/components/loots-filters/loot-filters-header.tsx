import { Button } from "@lootlog/ui/components/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useDebounceValue } from "usehooks-ts";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useSearchAll } from "@/hooks/api/game-data/use-search-all";
import { useItemByHid } from "@/hooks/api/game-data/use-item-by-hid";
import { isItemHid } from "@/lib/utils/hid-detection";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { Item } from "@/hooks/api/game-data/use-items";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";

export type LootFiltersHeaderProps = {
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
};

export const LootFiltersHeader = ({
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
}: LootFiltersHeaderProps) => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const [debouncedSearch] = useDebounceValue(searchQuery, 100);
  const { world } = useGuildContext();
  const { setFilters, filters } = useLootsFilters();

  const { data: searchResults, isLoading } = useSearchAll({
    search: debouncedSearch,
    world: world || "",
  });

  const isHid = isItemHid(searchQuery);
  const { data: hidItem } = useItemByHid(searchQuery.trim(), isHid);

  const handleSelectNpc = (npc: Npc) => {
    setFilters({ npcs: [...filters.npcs, npc.name] });
    setIsCommandOpen(false);
    setSearchQuery("");
  };

  const handleSelectItem = (item: Item) => {
    setFilters({ search: item.name });
    setIsCommandOpen(false);
    setSearchQuery("");
  };

  const handleSelectPlayer = (player: { name: string }) => {
    setFilters({ players: [...filters.players, player.name] });
    setIsCommandOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  console.log("render LootFiltersHeader");
  console.log(searchResults?.npcs && searchResults.npcs.length > 0);

  return (
    <>
      <div className="bg-background w-full flex flex-wrap md:flex-nowrap px-3 items-start md:items-center gap-2 border-b py-2 md:py-0 md:h-14">
        <Button
          variant="outline"
          onClick={() => setIsCommandOpen(true)}
          className="relative flex-1 justify-start text-muted-foreground max-w-full min-w-0"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="max-w-full truncate">
            Szukaj przedmiotów, potworów, graczy...
          </span>
          <kbd className="pointer-events-none absolute right-2 top-[50%] translate-y-[-50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">Ctrl + K</span>
          </kbd>
        </Button>
        <WorldSwitcher />
        <Button
          onClick={onToggleFilters}
          variant={isFiltersOpen ? "default" : "outline"}
          size="icon"
          className="relative shrink-0 hidden md:inline-flex"
        >
          <Filter className="h-4 w-4" />
          <AnimatePresence>
            {hasActiveFilters && !isFiltersOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
              />
            )}
          </AnimatePresence>
        </Button>
      </div>

      {isMobile && (
        <Button
          onClick={onToggleFilters}
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20 md:hidden"
        >
          <Filter className="h-5 w-5" />
          <AnimatePresence>
            {hasActiveFilters && !isFiltersOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
              />
            )}
          </AnimatePresence>
        </Button>
      )}

      <CommandDialog
        shouldFilter={false}
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
      >
        <CommandInput
          placeholder="Szukaj przedmiotów, potworów, graczy..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Wyszukiwanie...
            </div>
          )}

          {!debouncedSearch && !isLoading && (
            <CommandEmpty>Zacznij wpisywać aby wyszukać...</CommandEmpty>
          )}

          {debouncedSearch && !isLoading && (
            <>
              {hidItem && (
                <CommandGroup heading="Znaleziony przedmiot (HID)">
                  <CommandItem onSelect={() => handleSelectItem(hidItem)}>
                    <img
                      src={hidItem.icon}
                      alt={hidItem.name}
                      className="h-6 w-6 mr-2"
                    />
                    <span>{hidItem.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Lvl {hidItem.lvl}
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {searchResults?.npcs && searchResults.npcs.length > 0 && (
                <CommandGroup heading="Potwory">
                  {searchResults.npcs.map((npc) => (
                    <CommandItem
                      key={npc.id}
                      onSelect={() => handleSelectNpc(npc)}
                    >
                      <div className="w-8">
                        {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                        <img
                          className="relative cursor-pointer rounded-lg max-h-10 max-w-8"
                          src={`${MARGONEM_CDN_NPCS_URL}${npc.icon}`}
                        />
                      </div>
                      <span>{npc.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Lvl {npc.lvl}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults?.items && searchResults.items.length > 0 && (
                <CommandGroup heading="Przedmioty">
                  {searchResults.items.map((item) => (
                    <CommandItem
                      key={item.hid}
                      onSelect={() => handleSelectItem(item)}
                    >
                      <img
                        src={item.icon}
                        alt={item.name}
                        className="h-6 w-6 mr-2"
                      />
                      <span>{item.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Lvl {item.lvl}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults?.players && searchResults.players.length > 0 && (
                <CommandGroup heading="Gracze">
                  {searchResults.players.map((player) => (
                    <CommandItem
                      key={player.id}
                      onSelect={() => handleSelectPlayer(player)}
                    >
                      <img
                        src={player.icon}
                        alt={player.name}
                        className="h-6 w-6 mr-2"
                      />
                      <span>{player.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Lvl {player.lvl} {player.prof}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!hidItem &&
                (!searchResults?.npcs || searchResults.npcs.length === 0) &&
                (!searchResults?.items || searchResults.items.length === 0) &&
                (!searchResults?.players ||
                  searchResults.players.length === 0) && (
                  <CommandEmpty>Nie znaleziono wyników.</CommandEmpty>
                )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
