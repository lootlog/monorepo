import { uniqBy } from "es-toolkit";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

import {
  getAllControllerSearchAllQueryKey,
  useAllControllerSearchAll,
  type NpcHitDtoOutput,
} from "@lootlog/client/search";

import {
  serializeLootsFilters,
  useLootsFilters,
} from "@/hooks/use-loots-filters";
import { ROUTES } from "@/config/routes";
import type { AppNavigationItemId } from "@/navigation/app-navigation";
import { parseItemHid } from "@/lib/utils/hid-detection";
import { useTranslation } from "react-i18next";

export type GuildSearchPage = {
  id: AppNavigationItemId;
  label: string;
  href: string;
};

export type LootSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Organization pages the member may open, offered before any typing. */
  pages?: GuildSearchPage[];
  /** False when the member cannot read loots, so only pages are searched. */
  canSearchLoots?: boolean;
};

type LootFiltersUpdate = Parameters<typeof serializeLootsFilters>[1];

const normalizeForMatch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pl");

import { allTrue, anyTrue } from "./loot-search-presentation";

export const useLootSearchCommand = ({
  open,
  onOpenChange,
  pages = [],
  canSearchLoots = true,
}: LootSearchCommandProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 200);
  const { world, setWorld } = useGuildWorld();
  const guildId = useGuildId();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { filters, setFilters } = useLootsFilters();
  const trimmedSearch = searchQuery.trim();

  // Loot states read these terms, so a member without loot access sees pages only.
  const [lootSearchTerm, debouncedLootSearch] = canSearchLoots
    ? [trimmedSearch, debouncedSearch]
    : ["", ""];

  const parsedHid = parseItemHid(lootSearchTerm);
  const isHidInput = lootSearchTerm.toUpperCase().startsWith("ITEM#");

  const lootsPath = ROUTES.guild.base(guildId ?? "");
  const isOnLootsPage = pathname.replace(/\/$/, "") === lootsPath;

  const pageQuery = normalizeForMatch(trimmedSearch);

  const pageResults = pages.filter((page) =>
    normalizeForMatch(page.label).includes(pageQuery),
  );

  // Items and monsters are shared by every world; `world` narrows only the
  // characters, whose loots the list shows for the selected world.
  const searchParams = { search: debouncedLootSearch, world: world || "" };

  const searchResultsQuery = useAllControllerSearchAll(searchParams, {
    query: {
      queryKey: getAllControllerSearchAllQueryKey(searchParams),
      enabled: debouncedLootSearch.length >= 2 && !isHidInput,
    },
  });

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
    queryFn: async ({ signal }) => {
      if (!guildId || !hidLootQueryParams) {
        return null;
      }

      const response = await lootsControllerFetchLootsByGuildId(
        {
          guildId,
        },
        hidLootQueryParams,
        { signal },
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

  const close = () => {
    onOpenChange(false);
    setSearchQuery("");
  };

  // On the loot list a hit refines the current filters; from any other page
  // it opens the loot list with just that filter.
  const applyLootFilters = (update: LootFiltersUpdate) => {
    if (isOnLootsPage) {
      void setFilters(update);
    } else {
      void navigate({ href: serializeLootsFilters(lootsPath, update) });
    }

    close();
  };

  const handleSelectPage = (page: GuildSearchPage) => {
    void navigate({ to: page.href });
    close();
  };

  const handleSelectNpc = (npc: NpcHitDtoOutput) => {
    applyLootFilters({ npcs: [npc.name] });
  };

  const handleSelectItem = (item: { name: string }) => {
    applyLootFilters({ itemNames: [item.name] });
  };

  const handleSelectItemByHid = (hid: string) => {
    // The HID names its world, which the loot list must show to find it.
    if (parsedHid && parsedHid.world !== world) setWorld(parsedHid.world);

    applyLootFilters({
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
  };

  const handleSelectPlayer = (player: { name: string }) => {
    applyLootFilters({ players: [player.name] });
  };

  // The search service can be behind or miss a name entirely. This matches the
  // term against the loot database itself, so a name it has not indexed is
  // still reachable.
  const handleDirectSearch = () => {
    applyLootFilters({ search: lootSearchTerm });
  };

  const handleClearDirectSearch = () => {
    setFilters({ search: null });
  };

  // Other pages may use a `search` parameter of their own.
  const activeDirectSearch = isOnLootsPage ? filters.search : "";

  const canSearchDirectly = allTrue(!isHidInput, lootSearchTerm.length >= 2);

  // Selecting a hit filters by name, so each name is one option even when
  // several editions or ids share it.
  const npcResults = uniqBy(searchResults?.npcs ?? [], (npc) => npc.name);
  const itemResults = uniqBy(searchResults?.items ?? [], (item) => item.name);
  const playerResults = searchResults?.players ?? [];

  const hasSearchResults = anyTrue(
    npcResults.length > 0,
    itemResults.length > 0,
    playerResults.length > 0,
  );

  const showSearchLoading = allTrue(
    !isHidInput,
    lootSearchTerm.length >= 2,
    anyTrue(
      debouncedLootSearch !== lootSearchTerm,
      allTrue(isSearchLoading, Boolean(debouncedLootSearch), !hasSearchResults),
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
    lootSearchTerm.length >= 2,
    Boolean(debouncedLootSearch),
    !showSearchLoading,
    !searchResultsQuery.isError,
    Boolean(hasSearchResults),
  );

  const showNoLootResults = allTrue(
    !isHidInput,
    lootSearchTerm.length >= 2,
    Boolean(debouncedLootSearch),
    !showSearchLoading,
    !searchResultsQuery.isError,
    !hasSearchResults,
  );

  const showNoResults = allTrue(
    pageResults.length === 0,
    canSearchLoots ? showNoLootResults : trimmedSearch.length > 0,
  );

  const showKeepTyping = allTrue(
    !isHidInput,
    lootSearchTerm.length === 1,
    pageResults.length === 0,
  );

  const showSearchError = allTrue(
    !isHidInput,
    lootSearchTerm.length >= 2,
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
    activeDirectSearch,
    canSearchDirectly,
    handleDirectSearch,
    handleClearDirectSearch,
    searchQuery,
    setSearchQuery,
    trimmedSearch,
    canSearchLoots,
    world,
    pageResults,
    handleSelectPage,
    showKeepTyping,
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
