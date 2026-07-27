import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
} from "@lootlog/api-client/react-query/main/loots";
import type { LootsControllerFetchLootsByGuildIdParams } from "@lootlog/api-client/models/main/loots-controller-fetch-loots-by-guild-id-params";
import {
  getAllControllerSearchAllQueryKey,
  useAllControllerSearchAll,
} from "@lootlog/api-client/react-query/search/all";
import type { NpcHitDtoOutput } from "@lootlog/api-client/models/search/npc-hit-dto-output";
import { ItemRarity } from "@/lib/loots/loot-types";
import { parseItemHid } from "@/lib/utils/hid-detection";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { cn } from "@lootlog/ui/lib/utils";
import { NPC_TYPE_NAMES, ITEM_RARITY_NAMES } from "@/constants/npc";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CircleAlert,
  ClipboardPaste,
  PackageSearch,
  SearchX,
} from "lucide-react";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12 },
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
  const trimmedSearch = searchQuery.trim();
  const parsedHid = parseItemHid(trimmedSearch);
  const isHidInput = trimmedSearch.toUpperCase().startsWith("ITEM#");

  const searchResultsQuery = useAllControllerSearchAll(
    {
      search: debouncedSearch,
      world: world || "",
    },
    {
      query: {
        queryKey: getAllControllerSearchAllQueryKey({
          search: debouncedSearch,
          world: world || "",
        }),
        enabled: debouncedSearch.length >= 2 && !isHidInput,
      },
    },
  );
  const searchResults = searchResultsQuery.data;
  const isSearchLoading = searchResultsQuery.isLoading;

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
  const {
    data: hidItem,
    isError: isHidError,
    isFetched: isHidFetched,
    isFetching: isHidLoading,
  } = useQuery({
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

  const handleSelectNpc = (npc: NpcHitDtoOutput) => {
    setFilters({ npcs: [npc.name] });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleSelectItem = (item: { name: string }) => {
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

  const hasSearchResults =
    (searchResults?.npcs && searchResults.npcs.length > 0) ||
    (searchResults?.items && searchResults.items.length > 0) ||
    (searchResults?.players && searchResults.players.length > 0);

  const showSearchLoading =
    !isHidInput &&
    trimmedSearch.length >= 2 &&
    (debouncedSearch !== trimmedSearch ||
      (isSearchLoading && Boolean(debouncedSearch) && !hasSearchResults));
  const showHidNotFound =
    isHid && isHidFetched && !isHidLoading && !isHidError && !hidItem;

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  const dialogContent = (
    <>
      <CommandInput
        placeholder={t("loots.searchCommand.placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
        className="h-14 pr-12 text-base"
      />
      <CommandList className="custom-scrollbar h-64 min-h-64 p-2 sm:h-72 sm:min-h-72 [&>div]:min-h-full">
        <AnimatePresence mode="wait" initial={false}>
          {!trimmedSearch && (
            <motion.div
              key="idle"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-background">
                <PackageSearch className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.idleTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.startTyping")}
              </p>
              <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground sm:flex">
                <ClipboardPaste className="size-4 text-primary" />
                <span>{t("loots.searchCommand.hidHint")}</span>
                <code className="col-span-2 font-mono text-foreground sm:col-auto">
                  {t("loots.searchCommand.hidExample")}
                </code>
              </div>
            </motion.div>
          )}

          {!isHidInput && trimmedSearch.length === 1 && (
            <motion.div
              key="keep-typing"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <PackageSearch className="size-6 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("loots.searchCommand.keepTyping")}
              </p>
            </motion.div>
          )}

          {isHidInput && !isHid && (
            <motion.div
              key="invalid-hid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                <CircleAlert className="size-5 text-amber-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidInvalidTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidInvalidDescription")}
              </p>
              <code className="mt-3 rounded-md bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
                {t("loots.searchCommand.hidExample")}
              </code>
            </motion.div>
          )}

          {isHid && isHidLoading && (
            <motion.div
              key="hid-loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <Spinner className="size-6 text-primary" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidLoadingTitle")}
              </h3>
              <code className="mt-2 max-w-full truncate font-mono text-xs text-muted-foreground">
                {trimmedSearch}
              </code>
            </motion.div>
          )}

          {isHid && isHidError && (
            <motion.div
              key="hid-error"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
                <CircleAlert className="size-5 text-destructive" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidErrorTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidErrorDescription")}
              </p>
            </motion.div>
          )}

          {showHidNotFound && (
            <motion.div
              key="hid-not-found"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                <SearchX className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {t("loots.searchCommand.hidNotFoundTitle")}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                {t("loots.searchCommand.hidNotFoundDescription")}
              </p>
              <code className="mt-3 max-w-full truncate font-mono text-xs text-muted-foreground">
                {trimmedSearch}
              </code>
            </motion.div>
          )}

          {isHid && hidItem && (
            <motion.div
              key="hid-result"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CommandGroup heading={t("loots.searchCommand.itemById")}>
                <CommandItem
                  value={`hid-${hidItem.hid}`}
                  onSelect={() => handleSelectItemByHid(hidItem.hid)}
                  className="min-h-16 rounded-lg px-3 py-2.5"
                >
                  <ItemImage
                    icon={hidItem.icon}
                    rarity={hidItem.rarity ?? ItemRarity.COMMON}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{hidItem.name}</div>
                    <div className="mt-0.5 flex min-w-0 text-xs text-muted-foreground">
                      <code className="truncate font-mono">
                        {trimmedSearch}
                      </code>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-primary" />
                </CommandItem>
              </CommandGroup>
            </motion.div>
          )}

          {showSearchLoading && (
            <motion.div
              key="search-loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-40 flex-col items-center justify-center py-10 text-muted-foreground"
            >
              <Spinner className="mb-3 size-6 text-primary" />
              <span className="text-sm">
                {t("loots.searchCommand.loading")}
              </span>
            </motion.div>
          )}

          {!isHidInput &&
            trimmedSearch.length >= 2 &&
            debouncedSearch &&
            !showSearchLoading &&
            hasSearchResults && (
              <motion.div
                key="search-results"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {searchResults?.npcs && searchResults.npcs.length > 0 && (
                  <CommandGroup heading={t("loots.searchCommand.npcs")}>
                    {searchResults.npcs.map((npc) => (
                      <CommandItem
                        key={`npc-${npc.id}`}
                        value={`npc-${npc.id}`}
                        onSelect={() => handleSelectNpc(npc)}
                        className="h-16 min-h-16 rounded-lg px-3 py-2"
                      >
                        <NpcSearchTile icon={npc.icon} name={npc.name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">
                            {npc.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {NPC_TYPE_NAMES[npc.type]}
                          </div>
                        </div>
                        {npc.lvl > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t("loots.searchCommand.level", {
                              level: npc.lvl,
                            })}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults?.items && searchResults.items.length > 0 && (
                  <CommandGroup heading={t("loots.searchCommand.items")}>
                    {searchResults.items.map((item) => (
                      <CommandItem
                        key={`item-${item.id}`}
                        value={`item-${item.id}`}
                        onSelect={() => handleSelectItem(item)}
                        className="h-16 min-h-16 rounded-lg px-3 py-2"
                      >
                        <ItemImage
                          icon={item.icon}
                          rarity={
                            (item.rarity as ItemRarity) ?? ItemRarity.COMMON
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">
                            {item.name}
                          </div>
                          {item.rarity && (
                            <div
                              className={cn(
                                "text-xs font-semibold",
                                getRarityStyle(item.rarity),
                              )}
                            >
                              {ITEM_RARITY_NAMES[item.rarity] ?? item.rarity}
                            </div>
                          )}
                        </div>
                        {item.lvl > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t("loots.searchCommand.level", {
                              level: item.lvl,
                            })}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchResults?.players && searchResults.players.length > 0 && (
                  <CommandGroup heading={t("loots.searchCommand.players")}>
                    {searchResults.players.map((player) => (
                      <CommandItem
                        key={`player-${player.id}`}
                        value={`player-${player.id}`}
                        onSelect={() => handleSelectPlayer(player)}
                        className="h-16 min-h-16 rounded-lg px-3 py-2"
                      >
                        <PlayerSearchTile
                          icon={player.icon}
                          name={player.name}
                          className="scale-75"
                        />
                        <span className="truncate font-semibold">
                          {player.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </motion.div>
            )}

          {!isHidInput &&
            trimmedSearch.length >= 2 &&
            debouncedSearch &&
            !showSearchLoading &&
            !hasSearchResults && (
              <motion.div
                key="no-results"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
                  <SearchX className="size-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {t("loots.searchCommand.noResults")}
                </h3>
                <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                  {t("loots.searchCommand.noResultsDescription")}
                </p>
              </motion.div>
            )}
        </AnimatePresence>
      </CommandList>
    </>
  );

  return (
    <CommandDialog
      shouldFilter={false}
      open={open}
      onOpenChange={handleOpenChange}
      title={t("loots.searchCommand.dialogTitle")}
      description={t("loots.searchCommand.dialogDescription")}
      className="top-1/2 w-[calc(100%-2rem)] max-w-xl rounded-2xl border-border bg-popover shadow-[0_24px_80px_rgba(0,0,0,0.45)] [&_[data-slot=command]]:rounded-2xl [&_[data-slot=command]]:bg-popover"
    >
      {dialogContent}
    </CommandDialog>
  );
};
