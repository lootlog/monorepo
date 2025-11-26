import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useSearchAll } from "@/hooks/api/game-data/use-search-all";
import { useItemByHid } from "@/hooks/api/game-data/use-item-by-hid";
import { isItemHid } from "@/lib/utils/hid-detection";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { Item as SearchItem } from "@/hooks/api/game-data/use-items";
import type { Item as LootItem } from "@/hooks/api/loots/use-loots";
import {
  ItemSearchTile,
  NpcSearchTile,
  PlayerSearchTile,
} from "@/components/tiles";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const LootSearchCommand = ({
  open,
  onOpenChange,
}: LootSearchCommandProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const [debouncedSearch] = useDebounceValue(searchQuery, 100);
  const { world } = useGuildContext();
  const { setFilters } = useLootsFilters();

  const { data: searchResults, isLoading } = useSearchAll({
    search: debouncedSearch,
    world: world || "",
  });

  const isHid = isItemHid(searchQuery);
  const { data: hidItem } = useItemByHid(searchQuery.trim(), isHid);

  const handleSelectNpc = (npc: Npc) => {
    setFilters({ npcs: [npc.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectItem = (item: SearchItem) => {
    setFilters({ itemNames: [item.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectItemByHid = (item: LootItem) => {
    setFilters({ hid: item.hid });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectPlayer = (player: { name: string }) => {
    setFilters({ players: [player.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <CommandDialog shouldFilter={false} open={open} onOpenChange={onOpenChange}>
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
              <CommandGroup heading="Znaleziony przedmiot (ID)">
                <CommandItem onSelect={() => handleSelectItemByHid(hidItem)}>
                  <ItemSearchTile icon={hidItem.icon} name={hidItem.name} />
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
                    <NpcSearchTile icon={npc.icon} name={npc.name} />
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
                    <ItemSearchTile icon={item.icon} name={item.name} />
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
                    <PlayerSearchTile icon={player.icon} name={player.name} />
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
  );
};
