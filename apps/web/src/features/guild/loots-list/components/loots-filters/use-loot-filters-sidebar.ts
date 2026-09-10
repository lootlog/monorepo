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

const getEntitySearchParams = (
  search: string,
  selectedNames: string,
  world: string | null | undefined,
) => {
  const queryWorld = world || "";

  if (search.length > 0) {
    return { search, world: queryWorld };
  }

  if (selectedNames.length > 0) {
    return { search: selectedNames.split(","), world: queryWorld };
  }

  return undefined;
};

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

const toFilterOptions = <Item extends { name: string }>(
  items: Item[] | undefined,
) =>
  (items ?? []).map((item) => ({
    value: item.name,
    label: item.name,
  }));

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

const getLootFilterInputValues = (filters: LootFilters) => ({
  npcLevelMin: filters.npcLevelMin ?? "",
  npcLevelMax: filters.npcLevelMax ?? "",
  itemLevelMin: filters.itemLevelMin ?? "",
  itemLevelMax: filters.itemLevelMax ?? "",
  playerLevelMin: filters.playerLevelMin ?? "",
  playerLevelMax: filters.playerLevelMax ?? "",
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

  const filterInputValues = getLootFilterInputValues(filters);

  const [customFilters, setCustomFilters] = useLocalStorage<SavedFilter[]>(
    CUSTOM_FILTERS_STORAGE_KEY,
    [],
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  const [playersSearchValue, setDebouncedPlayersSearchValue] = useState("");

  const debouncedPlayersSearchValue = useDebounce(
    playersSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const [npcsSearchValue, setDebouncedNpcsSearchValue] = useState("");

  const debouncedNpcsSearchValue = useDebounce(
    npcsSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const [itemsSearchValue, setDebouncedItemsSearchValue] = useState("");

  const debouncedItemsSearchValue = useDebounce(
    itemsSearchValue,
    DEFAULT_DEBOUNCE_MS,
  );

  const selectedPlayerNames = filters.players.join(",");
  const selectedNpcNames = filters.npcs.join(",");

  const playersSearchParams = getEntitySearchParams(
    debouncedPlayersSearchValue,
    selectedPlayerNames,
    world,
  );

  const npcsSearchParams = getEntitySearchParams(
    debouncedNpcsSearchValue,
    selectedNpcNames,
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
      enabled:
        debouncedPlayersSearchValue.length > 0 ||
        selectedPlayerNames.length > 0,
    },
  });

  const npcsQuery = useNpcsControllerGetNpcs(npcsSearchParams, {
    query: {
      queryKey: getNpcsControllerGetNpcsQueryKey(npcsSearchParams),
      enabled:
        debouncedNpcsSearchValue.length > 0 || selectedNpcNames.length > 0,
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

  const playersOptions = toFilterOptions(playersQuery.data);
  const npcsOptions = toFilterOptions(npcsQuery.data);
  const itemsOptions = toFilterOptions(itemsQuery.data?.hits);

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
    npcsOptions,
    setDebouncedNpcsSearchValue,
    debouncedNpcsSearchValue,
    npcsQuery,
    filterInputValues,
    itemActiveFilterCount,
    rarityOptions,
    selectedRarities,
    professionOptions,
    selectedProfessions,
    itemsOptions,
    setDebouncedItemsSearchValue,
    debouncedItemsSearchValue,
    itemsQuery,
    hidItem,
    playerActiveFilterCount,
    playersOptions,
    setDebouncedPlayersSearchValue,
    debouncedPlayersSearchValue,
    playersQuery,
    hasActiveFilters,
    clearFilters,
  };
};
