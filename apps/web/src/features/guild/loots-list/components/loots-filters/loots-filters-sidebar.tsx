import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { Badge } from "@lootlog/ui/components/badge";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { ItemImage } from "@lootlog/ui/components/item-image";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Bookmark } from "lucide-react";
import { useState, type FC } from "react";
import { FilterCombobox } from "./filter-combobox";
import { useLootFilterOptions } from "./use-loot-filter-options";
import { useDebounceValue, useLocalStorage } from "usehooks-ts";
import { cn } from "@lootlog/ui/lib/utils";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerResolveLootItemByHidQueryKey,
  useLootsControllerResolveLootItemByHid,
} from "@lootlog/api-client/react-query/main/loots";
import {
  getItemsControllerGetItemsQueryKey,
  useItemsControllerGetItems,
} from "@lootlog/api-client/react-query/search/items";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@lootlog/api-client/react-query/search/npcs";
import {
  getPlayersControllerGetPlayersQueryKey,
  usePlayersControllerGetPlayers,
} from "@lootlog/api-client/react-query/search/players";
import { ItemRarity } from "@/lib/loots/loot-types";
import type { LootsControllerResolveLootItemByHidParams } from "@lootlog/api-client/models/main/loots-controller-resolve-loot-item-by-hid-params";
import { formatItemHid, parseItemHid } from "@/lib/utils/hid-detection";
import { useLootsFilters } from "@/hooks/use-loots-filters";
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

const embeddedValue = <Value,>(
  embedded: boolean,
  embeddedValue: Value,
  sidebarValue: Value,
) => (embedded ? embeddedValue : sidebarValue);

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
  const initiallyOpenSections: string[] = [];
  if (npcActiveFilterCount > 0) initiallyOpenSections.push("npc");
  if (itemActiveFilterCount > 0) initiallyOpenSections.push("item");
  if (playerActiveFilterCount > 0) initiallyOpenSections.push("player");
  if (initiallyOpenSections.length === 0) initiallyOpenSections.push("npc");

  return {
    npcActiveFilterCount,
    itemActiveFilterCount,
    playerActiveFilterCount,
    initiallyOpenSections,
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

export const LootsFiltersSidebar: FC<LootsFiltersSidebarProps> = ({
  className,
  embedded = false,
}) => {
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

  const [debouncedPlayersSearchValue, setDebouncedPlayersSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const [debouncedNpcsSearchValue, setDebouncedNpcsSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const [debouncedItemsSearchValue, setDebouncedItemsSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
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
    initiallyOpenSections,
  } = getFilterSectionState(filters);

  const isQuickFilterApplied = (filter: SavedFilter["filters"]) =>
    JSON.stringify(filter) === JSON.stringify(getCurrentFiltersForSaving());

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("loots.filtersPanel.saveDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("loots.filtersPanel.saveDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Label htmlFor="filterName" className="text-sm font-medium">
              {t("loots.filtersPanel.saveDialog.nameLabel")}
            </Label>
            <Input
              id="filterName"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              placeholder={t("loots.filtersPanel.saveDialog.namePlaceholder")}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveFilter();
                }
              }}
            />
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("loots.filtersPanel.saveDialog.cancel")}
            </Button>
            <Button onClick={handleSaveFilter} disabled={!newFilterName.trim()}>
              <Bookmark className="h-4 w-4 mr-2" />
              {t("loots.filtersPanel.saveDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "h-full flex shrink-0 flex-col bg-background",
          embeddedValue(embedded, "w-full p-0", "w-[340px] py-3 pr-3"),
          className,
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden bg-filters-sidebar",
            embeddedValue(
              embedded,
              "border-0",
              "rounded-2xl border border-border",
            ),
          )}
        >
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div>
                <div className="space-y-3 border-b border-border/70 p-3 sm:p-4">
                  <div className="flex min-h-7 items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {t("loots.filtersPanel.quickFilters.title")}
                    </Label>
                    {canSaveCurrentFilter && (
                      <Button
                        onClick={() => setIsDialogOpen(true)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("loots.filtersPanel.quickFilters.saveButton")}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allQuickFilters.map((filter) => (
                      <Badge
                        key={filter.id}
                        variant={
                          isQuickFilterApplied(filter.filters)
                            ? "default"
                            : "outline"
                        }
                        className="group min-h-7 cursor-pointer transition-colors hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                        onClick={() => applyFilter(filter.filters)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            applyFilter(filter.filters);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isQuickFilterApplied(filter.filters)}
                      >
                        {"category" in filter && (
                          <span className="text-xs opacity-80">
                            {filter.category}:
                          </span>
                        )}
                        <span className={"category" in filter ? "ml-1" : ""}>
                          {filter.label}
                        </span>
                        {!("isDefault" in filter && filter.isDefault) && (
                          <button
                            type="button"
                            aria-label={t("common.removeOption", {
                              label: filter.label,
                            })}
                            className="ml-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomFilter(filter.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Accordion multiple defaultValue={initiallyOpenSections}>
                  <AccordionItem
                    value="npc"
                    className="border-b border-border/70 px-3 sm:px-4"
                  >
                    <AccordionTrigger className="min-h-11 py-0">
                      {t("loots.filtersPanel.npcSection.title")}
                      {npcActiveFilterCount > 0 && (
                        <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
                          {npcActiveFilterCount}
                        </span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.npcSection.npcTypesLabel")}
                        </Label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          {npcTypeOptions.map((npcType) => (
                            <div
                              key={npcType.value}
                              className="flex min-h-8 items-center gap-2"
                            >
                              <Checkbox
                                id={`npcType-${npcType.value}`}
                                checked={filters.npcTypes?.includes(
                                  npcType.value,
                                )}
                                onCheckedChange={(checked) => {
                                  const currentTypes = filters.npcTypes ?? [];
                                  const newTypes = checked
                                    ? [...currentTypes, npcType.value]
                                    : currentTypes.filter(
                                        (t) => t !== npcType.value,
                                      );
                                  updateFilters({ npcTypes: newTypes });
                                }}
                              />
                              <Label
                                htmlFor={`npcType-${npcType.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {npcType.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.npcSection.npcsLabel")}
                        </Label>
                        <FilterCombobox
                          name="npcs"
                          placeholder={t(
                            "loots.filtersPanel.npcSection.npcsPlaceholder",
                          )}
                          options={npcsOptions}
                          defaultValue={filters.npcs}
                          onSelect={(_, values) =>
                            updateFilters({ npcs: values })
                          }
                          controlledSearch
                          onSearchChange={setDebouncedNpcsSearchValue}
                          searchValue={debouncedNpcsSearchValue}
                          loading={npcsQuery.isLoading}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.minLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filterInputValues.npcLevelMin}
                            onChange={(e) =>
                              updateFilters({ npcLevelMin: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.maxLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={filterInputValues.npcLevelMax}
                            onChange={(e) =>
                              updateFilters({ npcLevelMax: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="item"
                    className="border-b border-border/70 px-3 sm:px-4"
                  >
                    <AccordionTrigger className="min-h-11 py-0">
                      {t("loots.filtersPanel.itemSection.title")}
                      {itemActiveFilterCount > 0 && (
                        <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
                          {itemActiveFilterCount}
                        </span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.itemSection.raritiesLabel")}
                        </Label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          {rarityOptions.map((rarity) => (
                            <div
                              key={rarity.value}
                              className="flex min-h-8 items-center gap-2"
                            >
                              <Checkbox
                                id={`rarity-${rarity.value}`}
                                checked={filters.rarities?.includes(
                                  rarity.value,
                                )}
                                onCheckedChange={(checked) => {
                                  const currentRarities =
                                    filters.rarities ?? [];
                                  const newRarities = checked
                                    ? [...currentRarities, rarity.value]
                                    : currentRarities.filter(
                                        (r) => r !== rarity.value,
                                      );
                                  updateFilters({ rarities: newRarities });
                                }}
                              />
                              <Label
                                htmlFor={`rarity-${rarity.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {rarity.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.itemSection.professionsLabel")}
                        </Label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          {professionOptions.map((profession) => (
                            <div
                              key={profession.value}
                              className="flex min-h-8 items-center gap-2"
                            >
                              <Checkbox
                                id={`itemProfession-${profession.value}`}
                                checked={filters.professions?.includes(
                                  profession.value,
                                )}
                                onCheckedChange={(checked) => {
                                  const currentProfessions =
                                    filters.professions ?? [];
                                  const newProfessions = checked
                                    ? [...currentProfessions, profession.value]
                                    : currentProfessions.filter(
                                        (prof) => prof !== profession.value,
                                      );
                                  updateFilters({
                                    professions: newProfessions,
                                  });
                                }}
                              />
                              <Label
                                htmlFor={`itemProfession-${profession.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {profession.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.itemSection.itemsLabel")}
                        </Label>
                        <FilterCombobox
                          name="itemNames"
                          placeholder={t(
                            "loots.filtersPanel.itemSection.itemsPlaceholder",
                          )}
                          options={itemsOptions}
                          defaultValue={filters.itemNames}
                          onSelect={(_, values) =>
                            updateFilters({ itemNames: values })
                          }
                          controlledSearch
                          onSearchChange={setDebouncedItemsSearchValue}
                          searchValue={debouncedItemsSearchValue}
                          loading={itemsQuery.isLoading}
                          minimumSearchLength={2}
                        />
                      </div>

                      {hidItem && filters.hid && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t(
                              "loots.filtersPanel.itemSection.filteredItemLabel",
                            )}
                          </Label>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <ItemImage
                              icon={hidItem.icon}
                              rarity={hidItem.rarity ?? ItemRarity.COMMON}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {hidItem.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("loots.filtersPanel.common.levelValue", {
                                  level: hidItem.lvl,
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => updateFilters({ hid: "" })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.minLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filterInputValues.itemLevelMin}
                            onChange={(e) =>
                              updateFilters({ itemLevelMin: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.maxLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={filterInputValues.itemLevelMax}
                            onChange={(e) =>
                              updateFilters({ itemLevelMax: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="player" className="px-3 sm:px-4">
                    <AccordionTrigger className="min-h-11 py-0">
                      {t("loots.filtersPanel.playerSection.title")}
                      {playerActiveFilterCount > 0 && (
                        <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
                          {playerActiveFilterCount}
                        </span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 border-t border-border/70 pb-3 pt-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.playerSection.playersLabel")}
                        </Label>
                        <FilterCombobox
                          name="players"
                          placeholder={t(
                            "loots.filtersPanel.playerSection.playersPlaceholder",
                          )}
                          options={playersOptions}
                          defaultValue={filters.players}
                          onSelect={(_, values) =>
                            updateFilters({ players: values })
                          }
                          controlledSearch
                          onSearchChange={setDebouncedPlayersSearchValue}
                          searchValue={debouncedPlayersSearchValue}
                          loading={playersQuery.isLoading}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.minLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filterInputValues.playerLevelMin}
                            onChange={(e) =>
                              updateFilters({ playerLevelMin: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            {t("loots.filtersPanel.common.maxLevel")}
                          </Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={filterInputValues.playerLevelMax}
                            onChange={(e) =>
                              updateFilters({ playerLevelMax: e.target.value })
                            }
                            min={0}
                            max={500}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </div>

          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                layout
                initial={{ opacity: 0, scaleY: 0.96 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.96 }}
                style={{ transformOrigin: "bottom" }}
                className="overflow-hidden border-t border-border bg-background/95 px-3"
              >
                <div className="flex h-14 w-full items-center">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t("loots.filtersPanel.quickFilters.clearButton")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
