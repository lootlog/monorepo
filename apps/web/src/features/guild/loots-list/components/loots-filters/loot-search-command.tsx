import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useSearchAll } from "@/hooks/api/game-data/use-search-all";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
} from "@/lib/api/generated/main/loots/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@/lib/api/generated/main/model";
import { ItemRarity } from "@/lib/loots/loot-types";
import { parseItemHid } from "@/lib/utils/hid-detection";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { GameItem } from "@/hooks/api/game-data/use-items";
import { ItemImage, NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { cn } from "@lootlog/ui/lib/utils";
import { NPC_TYPE_NAMES, ITEM_RARITY_NAMES } from "@/constants/npc";
import { motion, Reorder } from "framer-motion";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useTranslation } from "react-i18next";
import { ThemeInteractiveFrame } from "@/themes";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15,
    },
  },
};

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
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 200);
  const { world } = useGuildContext();
  const guildId = useGuildId();
  const { setFilters } = useLootsFilters();

  const { data: searchResults, isLoading } = useSearchAll({
    search: debouncedSearch,
    world: world || "",
  });

  const parsedHid = parseItemHid(searchQuery.trim());
  const isHid = !!parsedHid;
  const hidLootQueryParams:
    | LootsControllerFetchLootsByGuildIdParams
    | undefined = parsedHid
    ? {
        hid: parsedHid.hid,
        world: parsedHid.world,
        limit: 1,
      }
    : undefined;
  const { data: hidItem } = useQuery({
    queryKey: hidLootQueryParams
      ? getLootsControllerFetchLootsByGuildIdQueryKey(
          { guildId: guildId ?? "" },
          hidLootQueryParams,
        )
      : ["loot-search", "hid-item"],
    queryFn: async () => {
      if (!guildId || !hidLootQueryParams) {
        return null;
      }

      const response = await lootsControllerFetchLootsByGuildId(
        {
          guildId,
        },
        hidLootQueryParams,
      );
      const firstLoot = response[0];

      return (
        firstLoot?.items.find((item) => item.hid === hidLootQueryParams.hid) ??
        null
      );
    },
    enabled: !!guildId && !!hidLootQueryParams,
    staleTime: 5 * 60 * 1000,
  });

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
    setFilters({
      hid,
      search: null,
      npcTypes: null,
      npcs: null,
      npcLevelMin: null,
      npcLevelMax: null,
      rarities: null,
      itemLevelMin: null,
      itemLevelMax: null,
      itemNames: null,
      players: null,
      playerLevelMin: null,
      playerLevelMax: null,
    });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectPlayer = (player: { name: string }) => {
    setFilters({ players: [player.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  const hasResults =
    hidItem ||
    (searchResults?.npcs && searchResults.npcs.length > 0) ||
    (searchResults?.items && searchResults.items.length > 0) ||
    (searchResults?.players && searchResults.players.length > 0);

  const showLoading = isLoading && debouncedSearch && !hasResults;

  const dialogContent = (
    <>
      <CommandInput
        placeholder={t("loots.searchCommand.placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="h-[350px] min-h-[350px] custom-scrollbar">
        {showLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          >
            <Spinner className="mb-2 h-6 w-6" />
            <span className="text-sm">{t("loots.searchCommand.loading")}</span>
          </motion.div>
        )}

        {!debouncedSearch && !isLoading && (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CommandEmpty>{t("loots.searchCommand.startTyping")}</CommandEmpty>
          </motion.div>
        )}

        {debouncedSearch && !showLoading && (
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {hidItem && (
              <CommandGroup heading={t("loots.searchCommand.itemById")}>
                <CommandItem
                  value={`hid-${hidItem.hid}`}
                  onSelect={() => handleSelectItemByHid(hidItem.hid)}
                  className="p-2! px-2!"
                >
                  <ItemImage
                    icon={hidItem.icon}
                    rarity={hidItem.rarity ?? ItemRarity.COMMON}
                  />
                  <span>{hidItem.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Lvl {hidItem.lvl}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {!isHid && searchResults?.npcs && searchResults.npcs.length > 0 && (
              <CommandGroup heading={t("loots.searchCommand.npcs")}>
                <Reorder.Group
                  axis="y"
                  values={searchResults.npcs}
                  onReorder={() => {}}
                  as="div"
                >
                  {searchResults.npcs.map((npc) => {
                    return (
                      <Reorder.Item
                        key={`npc-${npc.id}`}
                        value={npc}
                        as="div"
                        drag={false}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CommandItem
                          value={`npc-${npc.id}`}
                          onSelect={() => handleSelectNpc(npc)}
                          className="p-2! px-2!"
                        >
                          <NpcSearchTile icon={npc.icon} name={npc.name} />
                          <div className="flex flex-col">
                            <span className="font-semibold">{npc.name}</span>

                            <span className="text-xs text-muted-foreground">
                              {NPC_TYPE_NAMES[npc.type]}
                            </span>
                          </div>
                          <span className="ml-auto text-xs text-muted-foreground">
                            Lvl {npc.lvl}
                          </span>
                        </CommandItem>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </CommandGroup>
            )}
            {!isHid &&
              searchResults?.items &&
              searchResults.items.length > 0 && (
                <CommandGroup heading={t("loots.searchCommand.items")}>
                  <Reorder.Group
                    axis="y"
                    values={searchResults.items}
                    onReorder={() => {}}
                    as="div"
                  >
                    {searchResults.items.map((item) => (
                      <Reorder.Item
                        key={`item-${item.id}`}
                        value={item}
                        as="div"
                        drag={false}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CommandItem
                          value={`item-${item.id}`}
                          onSelect={() => handleSelectItem(item)}
                          className="p-2! px-2!"
                        >
                          <ItemImage
                            icon={item.icon}
                            rarity={
                              (item.rarity as ItemRarity) ?? ItemRarity.COMMON
                            }
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.name}</span>
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
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </CommandGroup>
              )}
            {!isHid &&
              searchResults?.players &&
              searchResults.players.length > 0 && (
                <CommandGroup heading={t("loots.searchCommand.players")}>
                  <Reorder.Group
                    axis="y"
                    values={searchResults.players}
                    onReorder={() => {}}
                    as="div"
                  >
                    {searchResults.players.map((player) => (
                      <Reorder.Item
                        key={`player-${player.id}`}
                        value={player}
                        as="div"
                        drag={false}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CommandItem
                          value={`player-${player.id}`}
                          onSelect={() => handleSelectPlayer(player)}
                          className="p-0! px-2!"
                        >
                          <PlayerSearchTile
                            icon={player.icon}
                            name={player.name}
                            className="scale-75"
                          />
                          <span className="font-semibold">{player.name}</span>
                        </CommandItem>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </CommandGroup>
              )}
            {!hasResults && (
              <CommandEmpty>{t("loots.searchCommand.noResults")}</CommandEmpty>
            )}
          </motion.div>
        )}
      </CommandList>
    </>
  );

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={onOpenChange}
      className="top-[25%] sm:top-[50%]"
    >
      <ThemeInteractiveFrame isHovered={false} isActive={open} subtle>
        {dialogContent}
      </ThemeInteractiveFrame>
    </CommandDialog>
  );
};
