import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerResolveLootItemByHidQueryKey,
  useLootsControllerResolveLootItemByHid,
  type LootsControllerResolveLootItemByHidParams,
} from "@lootlog/client/main";
import {
  getItemsControllerGetItemsQueryKey,
  getNpcsControllerGetNpcsQueryKey,
  getPlayersControllerGetPlayersQueryKey,
  useItemsControllerGetItems,
  useNpcsControllerGetNpcs,
  usePlayersControllerGetPlayers,
} from "@lootlog/client/search";
import { uniqBy } from "es-toolkit";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { useLootFilterOptions } from "./use-loot-filter-options";

import { useLootsFilters } from "@/hooks/use-loots-filters";
import { formatItemHid, parseItemHid } from "@/lib/utils/hid-detection";
import { useTranslation } from "react-i18next";

const DEFAULT_DEBOUNCE_MS = 500;

const CUSTOM_FILTERS_STORAGE_KEY = "loots-custom-quick-filters";

type SavedFilter = {
  id: string;
  label: string;
  filters: {
    players?: string[];
    npcs?: string[];
    rarities?: string[];
    professions?: string[];
    npcTypes?: string[];
    npcLevelMin?: string;
    npcLevelMax?: string;
    itemLevelMin?: string;
    itemLevelMax?: string;
    playerLevelMin?: string;
    playerLevelMax?: string;
    hid?: string;
    itemNames?: string[];
  };
};

type LootsFiltersSidebarProps = {
  className?: string;
  embedded?: boolean;
};

type LootFilters = ReturnType<typeof useLootsFilters>["filters"];

// Selected names need no lookup: the filter value is the label.
const getEntitySearchParams = (
  search: string,
  world: string | null | undefined,
) => (search.length > 0 ? { search, world: world || "" } : undefined);

const getHidQueryState = (
  hid: string | null | undefined,
  world: string | null | undefined,
) => {
  const parsedHid = parseItemHid(hid && world ? formatItemHid(hid, world) : "");

  const queryParams: LootsControllerResolveLootItemByHidParams | undefined =
    parsedHid ? { hid: parsedHid.hid, world: parsedHid.world } : undefined;

  return {
    queryParams,
    fallbackQueryParams: queryParams ?? { hid: "" },
  };
};

// Filters match by name, so one hit per name is enough for the option list.
const uniqueByName = <Hit extends { name: string }>(hits: Hit[] | undefined) =>
  uniqBy(hits ?? [], (hit) => hit.name);

const getFilterSectionState = (filters: LootFilters) => {
  const npcActiveFilterCount =
    Number(filters.npcTypes.length > 0) +
    Number(filters.npcs.length > 0) +
    Number(Boolean(filters.npcLevelMin || filters.npcLevelMax));

  const itemActiveFilterCount =
    Number(filters.rarities.length > 0) +
    Number(filters.professions.length > 0) +
    Number(filters.itemNames.length > 0 || Boolean(filters.hid)) +
    Number(Boolean(filters.itemLevelMin || filters.itemLevelMax));

  const playerActiveFilterCount =
    Number(filters.players.length > 0) +
    Number(Boolean(filters.playerLevelMin || filters.playerLevelMax));

  return {
    npcActiveFilterCount,
    itemActiveFilterCount,
    playerActiveFilterCount,
  };
};

// Level bounds travel through the URL as strings; the inputs work on numbers.
const toLevelNumber = (value: string) =>
  value.length > 0 ? Number(value) : undefined;

export const toLevelFilterValue = (value: number | undefined) =>
  value === undefined ? "" : String(value);

const getLootLevelRanges = (filters: LootFilters) => ({
  npc: {
    min: toLevelNumber(filters.npcLevelMin),
    max: toLevelNumber(filters.npcLevelMax),
  },
  item: {
    min: toLevelNumber(filters.itemLevelMin),
    max: toLevelNumber(filters.itemLevelMax),
  },
  player: {
    min: toLevelNumber(filters.playerLevelMin),
    max: toLevelNumber(filters.playerLevelMax),
  },
});

export const useLootFiltersSidebar = ({
  className,
  embedded = false,
}: LootsFiltersSidebarProps) => {
  const { t } = useTranslation();

  const {
    defaultQuickFilters,
    npcTypeOptions,
    professionOptions,
    rarityOptions,
  } = useLootFilterOptions();

  const { world } = useGuildContext();
  const guildId = useGuildId();

  const { filters, setFilters, hasActiveFilters, clearFilters } =
    useLootsFilters();

  const levelRanges = getLootLevelRanges(filters);

  const [customFilters, setCustomFilters] = useLocalStorage<SavedFilter[]>(
    CUSTOM_FILTERS_STORAGE_KEY,
    [],
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  const [playersSearchValue, setPlayersSearchValue] = useState("");

  const debouncedPlayersSearchValue = useDebounce(
    playersSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const [npcsSearchValue, setNpcsSearchValue] = useState("");

  const debouncedNpcsSearchValue = useDebounce(
    npcsSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const [itemsSearchValue, setItemsSearchValue] = useState("");

  const debouncedItemsSearchValue = useDebounce(
    itemsSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const playersSearchParams = getEntitySearchParams(
    debouncedPlayersSearchValue,
    world,
  );

  const npcsSearchParams = getEntitySearchParams(
    debouncedNpcsSearchValue,
    world,
  );

  const itemsSearchParams = {
    limit: 10,
    search: debouncedItemsSearchValue,
    world: world || "",
  };

  const playersQuery = usePlayersControllerGetPlayers(playersSearchParams, {
    query: {
      queryKey: getPlayersControllerGetPlayersQueryKey(playersSearchParams),
      enabled: debouncedPlayersSearchValue.length > 0,
    },
  });

  const npcsQuery = useNpcsControllerGetNpcs(npcsSearchParams, {
    query: {
      queryKey: getNpcsControllerGetNpcsQueryKey(npcsSearchParams),
      enabled: debouncedNpcsSearchValue.length > 0,
    },
  });

  const itemsQuery = useItemsControllerGetItems(itemsSearchParams, {
    query: {
      queryKey: getItemsControllerGetItemsQueryKey(itemsSearchParams),
      enabled: debouncedItemsSearchValue.length >= 2,
    },
  });

  const {
    queryParams: hidItemQueryParams,
    fallbackQueryParams: hidItemFallbackQueryParams,
  } = getHidQueryState(filters.hid, world);

  const { data: hidItem } = useLootsControllerResolveLootItemByHid(
    { guildId: guildId ?? "" },
    hidItemFallbackQueryParams,
    {
      query: {
        queryKey: getLootsControllerResolveLootItemByHidQueryKey(
          { guildId: guildId ?? "" },
          hidItemFallbackQueryParams,
        ),
        enabled: !!guildId && !!hidItemQueryParams,
      },
    },
  );

  const playerHits = uniqueByName(playersQuery.data);
  const npcHits = uniqueByName(npcsQuery.data);
  const itemHits = uniqueByName(itemsQuery.data?.hits);

  // A pending debounce reads as "searching" so the list never shows stale hits.
  const isPlayersSearching =
    playersSearchValue !== debouncedPlayersSearchValue ||
    playersQuery.isFetching;

  const isNpcsSearching =
    npcsSearchValue !== debouncedNpcsSearchValue || npcsQuery.isFetching;

  const isItemsSearching =
    itemsSearchValue !== debouncedItemsSearchValue || itemsQuery.isFetching;

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters((currentFilters) => {
      const mergedFilters = {
        ...currentFilters,
        ...newFilters,
      };

      return {
        search: mergedFilters.search || null,
        npcTypes:
          mergedFilters.npcTypes.length > 0 ? mergedFilters.npcTypes : null,
        npcs: mergedFilters.npcs.length > 0 ? mergedFilters.npcs : null,
        npcLevelMin: mergedFilters.npcLevelMin || null,
        npcLevelMax: mergedFilters.npcLevelMax || null,
        rarities:
          mergedFilters.rarities.length > 0 ? mergedFilters.rarities : null,
        professions:
          mergedFilters.professions.length > 0
            ? mergedFilters.professions
            : null,
        itemLevelMin: mergedFilters.itemLevelMin || null,
        itemLevelMax: mergedFilters.itemLevelMax || null,
        hid: mergedFilters.hid || null,
        itemNames:
          mergedFilters.itemNames.length > 0 ? mergedFilters.itemNames : null,
        players:
          mergedFilters.players.length > 0 ? mergedFilters.players : null,
        playerLevelMin: mergedFilters.playerLevelMin || null,
        playerLevelMax: mergedFilters.playerLevelMax || null,
      };
    });
  };

  const getCurrentFiltersForSaving = (): SavedFilter["filters"] => {
    return {
      players: filters.players.length > 0 ? filters.players : undefined,
      npcs: filters.npcs.length > 0 ? filters.npcs : undefined,
      rarities: filters.rarities.length > 0 ? filters.rarities : undefined,
      professions:
        filters.professions.length > 0 ? filters.professions : undefined,
      npcTypes: filters.npcTypes.length > 0 ? filters.npcTypes : undefined,
      npcLevelMin: filters.npcLevelMin || undefined,
      npcLevelMax: filters.npcLevelMax || undefined,
      itemLevelMin: filters.itemLevelMin || undefined,
      itemLevelMax: filters.itemLevelMax || undefined,
      playerLevelMin: filters.playerLevelMin || undefined,
      playerLevelMax: filters.playerLevelMax || undefined,
      hid: filters.hid || undefined,
      itemNames: filters.itemNames.length > 0 ? filters.itemNames : undefined,
    };
  };

  const isCurrentFilterAlreadySaved = (): boolean => {
    const currentFilters = getCurrentFiltersForSaving();
    const currentFiltersString = JSON.stringify(currentFilters);

    const isInDefaults = defaultQuickFilters.some(
      (filter) => JSON.stringify(filter.filters) === currentFiltersString,
    );

    const isInCustom = customFilters.some(
      (filter) => JSON.stringify(filter.filters) === currentFiltersString,
    );

    return isInDefaults || isInCustom;
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `custom-${Date.now()}`,
      label: newFilterName.trim(),
      filters: getCurrentFiltersForSaving(),
    };

    setCustomFilters((prev) => [...prev, newFilter]);
    setNewFilterName("");
    setIsDialogOpen(false);
  };

  const handleRemoveCustomFilter = (id: string) => {
    setCustomFilters((prev) => prev.filter((filter) => filter.id !== id));
  };

  const applyFilter = (filterData: SavedFilter["filters"]) => {
    clearFilters();
    updateFilters(filterData);
  };

  const allQuickFilters = [
    ...defaultQuickFilters,
    ...customFilters.map((f) => ({ ...f, isDefault: false })),
  ];

  const canSaveCurrentFilter =
    hasActiveFilters && !isCurrentFilterAlreadySaved();

  const {
    npcActiveFilterCount,
    itemActiveFilterCount,
    playerActiveFilterCount,
  } = getFilterSectionState(filters);

  const isQuickFilterApplied = (filter: SavedFilter["filters"]) =>
    JSON.stringify(filter) === JSON.stringify(getCurrentFiltersForSaving());

  const selectedNpcTypes = new Set(filters.npcTypes);
  const selectedRarities = new Set(filters.rarities);
  const selectedProfessions = new Set(filters.professions);

  return {
    isDialogOpen,
    setIsDialogOpen,
    t,
    className,
    newFilterName,
    setNewFilterName,
    handleSaveFilter,
    embedded,
    canSaveCurrentFilter,
    allQuickFilters,
    isQuickFilterApplied,
    filters,
    applyFilter,
    handleRemoveCustomFilter,
    npcActiveFilterCount,
    npcTypeOptions,
    selectedNpcTypes,
    updateFilters,
    npcHits,
    npcsSearchValue,
    setNpcsSearchValue,
    isNpcsSearching,
    npcsSearchError: npcsQuery.isError,
    levelRanges,
    itemActiveFilterCount,
    rarityOptions,
    selectedRarities,
    professionOptions,
    selectedProfessions,
    itemHits,
    itemsSearchValue,
    setItemsSearchValue,
    isItemsSearching,
    itemsSearchError: itemsQuery.isError,
    hidItem,
    playerActiveFilterCount,
    playerHits,
    playersSearchValue,
    setPlayersSearchValue,
    isPlayersSearching,
    playersSearchError: playersQuery.isError,
    hasActiveFilters,
    clearFilters,
  };
};
