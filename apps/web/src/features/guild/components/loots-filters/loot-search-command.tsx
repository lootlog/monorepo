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
import { NpcType, type Npc } from "@/hooks/api/game-data/use-npcs";
import type { GameItem } from "@/hooks/api/game-data/use-items";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import { ItemImage, NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { cn } from "@lootlog/ui/lib/utils";
import {
  NPC_TYPE_NAMES,
  SPECIAL_NPC_TYPES,
  ITEM_RARITY_NAMES,
} from "@/constants/npc";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Get badge styling based on NPC type
const getNpcBadgeStyle = (type: NpcType) => {
  switch (type) {
    case NpcType.TITAN:
      return "bg-primary/10 text-primary border-primary/20";
    case NpcType.COLOSSUS:
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case NpcType.HERO:
      return "bg-destructive/10 text-destructive border-destructive/20";
    case NpcType.EVENT_HERO:
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default:
      return "";
  }
};

// Get rarity text styling
const getRarityStyle = (rarity: string | null) => {
  switch (rarity) {
    case "LEGENDARY":
      return "text-orange-400";
    case "HEROIC":
      return "text-blue-500";
    case "UNIQUE":
      return "text-amber-300";
    case "UPGRADED":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
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

  const handleSelectItem = (item: GameItem) => {
    setFilters({ itemNames: [item.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectItemByHid = (hid: string) => {
    setFilters({ hid });
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
                <CommandItem
                  onSelect={() => handleSelectItemByHid(hidItem.hid)}
                  className="p-2! px-2!"
                >
                  <ItemImage icon={hidItem.icon} rarity={hidItem.rarity} />
                  <span>{hidItem.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Lvl {hidItem.lvl}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {searchResults?.npcs && searchResults.npcs.length > 0 && (
              <CommandGroup heading="Potwory">
                {searchResults.npcs.map((npc) => {
                  const isSpecial = SPECIAL_NPC_TYPES.includes(
                    npc.type as (typeof SPECIAL_NPC_TYPES)[number],
                  );
                  return (
                    <CommandItem
                      key={npc.id}
                      onSelect={() => handleSelectNpc(npc)}
                      className="p-2! px-2!"
                    >
                      <NpcSearchTile icon={npc.icon} name={npc.name} />
                      <div className="flex flex-col">
                        <span>{npc.name}</span>
                        {isSpecial ? (
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border w-fit",
                              getNpcBadgeStyle(npc.type),
                            )}
                          >
                            {NPC_TYPE_NAMES[npc.type]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {NPC_TYPE_NAMES[npc.type]}
                          </span>
                        )}
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Lvl {npc.lvl}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {searchResults?.items && searchResults.items.length > 0 && (
              <CommandGroup heading="Przedmioty">
                {searchResults.items.map((item) => (
                  <CommandItem
                    key={item.hid}
                    onSelect={() => handleSelectItem(item)}
                    className="p-2! px-2!"
                  >
                    <ItemImage
                      icon={item.icon}
                      rarity={(item.rarity as ItemRarity) ?? ItemRarity.COMMON}
                    />
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.rarity && (
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            getRarityStyle(item.rarity),
                          )}
                        >
                          {ITEM_RARITY_NAMES[item.rarity] ?? item.rarity}
                        </span>
                      )}
                    </div>
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
                    className="p-0! px-2!"
                  >
                    <PlayerSearchTile
                      icon={player.icon}
                      name={player.name}
                      className="scale-75"
                    />
                    <span>{player.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Lvl {player.lvl}
                      {player.prof?.charAt(0).toLowerCase()}
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
