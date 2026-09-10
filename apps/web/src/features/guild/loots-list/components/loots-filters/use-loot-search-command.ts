import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

import {
  getAllControllerSearchAllQueryKey,
  useAllControllerSearchAll,
  type NpcHitDtoOutput,
} from "@lootlog/client/search";

import { useLootsFilters } from "@/hooks/use-loots-filters";
import { parseItemHid } from "@/lib/utils/hid-detection";
import { useTranslation } from "react-i18next";

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

import { allTrue, anyTrue } from "./loot-search-presentation";

export const useLootSearchCommand = ({
  open,
  onOpenChange,
}: LootSearchCommandProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 200);
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

  const npcResults = searchResults?.npcs ?? [];
  const itemResults = searchResults?.items ?? [];
  const playerResults = searchResults?.players ?? [];
  const hasSearchResults = anyTrue(
    npcResults.length > 0,
    itemResults.length > 0,
    playerResults.length > 0,
  );

  const showSearchLoading = allTrue(
    !isHidInput,
    trimmedSearch.length >= 2,
    anyTrue(
      debouncedSearch !== trimmedSearch,
      allTrue(isSearchLoading, Boolean(debouncedSearch), !hasSearchResults),
    ),
  );
  const showHidNotFound = allTrue(
    isHid,
    isHidFetched,
    !isHidLoading,
    !isHidError,
    !hidItem,
  );
  const showSearchResults = allTrue(
    !isHidInput,
    trimmedSearch.length >= 2,
    Boolean(debouncedSearch),
    !showSearchLoading,
    !searchResultsQuery.isError,
    Boolean(hasSearchResults),
  );
  const showNoResults = allTrue(
    !isHidInput,
    trimmedSearch.length >= 2,
    Boolean(debouncedSearch),
    !showSearchLoading,
    !searchResultsQuery.isError,
    !hasSearchResults,
  );
  const showSearchError = allTrue(
    !isHidInput,
    trimmedSearch.length >= 2,
    !showSearchLoading,
    searchResultsQuery.isError,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  return {
    t,
    searchQuery,
    setSearchQuery,
    trimmedSearch,
    isHidInput,
    isHid,
    isHidLoading,
    isHidError,
    showHidNotFound,
    hidItem,
    handleSelectItemByHid,
    showSearchLoading,
    showSearchError,
    showSearchResults,
    npcResults,
    handleSelectNpc,
    itemResults,
    handleSelectItem,
    playerResults,
    handleSelectPlayer,
    showNoResults,
    open,
    onOpenChange,
    handleOpenChange,
  };
};
