import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { Badge } from "@lootlog/ui/components/badge";
import { Checkbox } from "@lootlog/ui/components/checkbox";
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
import { useNpcs } from "@/hooks/api/game-data/use-npcs";
import { useGuildPlayers } from "@/hooks/api/game-data/use-guild-players";
import { useItems } from "@/hooks/api/game-data/use-items";
import { useItemByHid } from "@/hooks/api/game-data/use-item-by-hid";
import { useLootFilterOptions } from "./use-loot-filter-options";
import { useDebounceValue, useLocalStorage } from "usehooks-ts";
import { cn } from "@lootlog/ui/lib/utils";
import { ItemImage } from "@/components/tiles";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { formatItemHid } from "@/lib/utils/hid-detection";
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
};

export const LootsFiltersSidebar: FC<LootsFiltersSidebarProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const { defaultQuickFilters, npcTypeOptions, rarityOptions } =
    useLootFilterOptions();
  const { world } = useGuildContext();
  const { filters, setFilters, hasActiveFilters, clearFilters } =
    useLootsFilters();
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

  const { data: playersData, isLoading: playersDataLoading } = useGuildPlayers({
    search: debouncedPlayersSearchValue,
    selectedPlayers: filters.players?.join(","),
    world: world || "",
  });

  const { data: npcsData, isLoading: npcsDataLoading } = useNpcs({
    search: debouncedNpcsSearchValue,
    selectedNpcs: filters.npcs?.join(","),
    world: world || "",
  });

  const { data: itemsData, isLoading: itemsDataLoading } = useItems({
    search: debouncedItemsSearchValue,
    world: world || "",
    limit: 10,
  });

  const { data: hidItem } = useItemByHid(
    filters.hid && world ? formatItemHid(filters.hid, world) : "",
    !!filters.hid && !!world,
  );

  const playersOptions =
    playersData?.map((player) => ({
      value: player.name,
      label: player.name,
    })) ?? [];

  const npcsOptions =
    npcsData?.map((npc) => ({
      value: npc.name,
      label: npc.name,
    })) ?? [];

  const itemsOptions =
    itemsData?.map((item) => ({
      value: item.name,
      label: item.name,
    })) ?? [];

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
          "w-[320px] bg-sidebar flex flex-col h-full shrink-0",
          className,
        )}
      >
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
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
                <div className="flex flex-wrap gap-2">
                  {allQuickFilters.map((filter) => (
                    <Badge
                      key={filter.id}
                      className="cursor-pointer hover:bg-primary/80 transition-colors group"
                      onClick={() => applyFilter(filter.filters)}
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
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
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

              <Separator />

              <Accordion
                type="multiple"
                defaultValue={["npc", "item", "player"]}
                className="space-y-4"
              >
                <AccordionItem value="npc" className="space-y-3">
                  <AccordionTrigger>
                    {t("loots.filtersPanel.npcSection.title")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("loots.filtersPanel.npcSection.npcTypesLabel")}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {npcTypeOptions.map((npcType) => (
                          <div
                            key={npcType.value}
                            className="flex items-center gap-2"
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
                        loading={npcsDataLoading}
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
                          value={filters.npcLevelMin ?? ""}
                          onChange={(e) =>
                            updateFilters({ npcLevelMin: e.target.value })
                          }
                          min={0}
                          max={500}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.common.maxLevel")}
                        </Label>
                        <Input
                          type="number"
                          placeholder="500"
                          value={filters.npcLevelMax ?? ""}
                          onChange={(e) =>
                            updateFilters({ npcLevelMax: e.target.value })
                          }
                          min={0}
                          max={500}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="item" className="space-y-3">
                  <AccordionTrigger>
                    {t("loots.filtersPanel.itemSection.title")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("loots.filtersPanel.itemSection.raritiesLabel")}
                      </Label>
                      <div className="flex flex-col gap-2">
                        {rarityOptions.map((rarity) => (
                          <div
                            key={rarity.value}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`rarity-${rarity.value}`}
                              checked={filters.rarities?.includes(rarity.value)}
                              onCheckedChange={(checked) => {
                                const currentRarities = filters.rarities ?? [];
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
                        loading={itemsDataLoading}
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
                            rarity={hidItem.rarity}
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
                          value={filters.itemLevelMin ?? ""}
                          onChange={(e) =>
                            updateFilters({ itemLevelMin: e.target.value })
                          }
                          min={0}
                          max={500}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          {t("loots.filtersPanel.common.maxLevel")}
                        </Label>
                        <Input
                          type="number"
                          placeholder="500"
                          value={filters.itemLevelMax ?? ""}
                          onChange={(e) =>
                            updateFilters({ itemLevelMax: e.target.value })
                          }
                          min={0}
                          max={500}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="player" className="space-y-3">
                  <AccordionTrigger>
                    {t("loots.filtersPanel.playerSection.title")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
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
                        loading={playersDataLoading}
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
                          value={filters.playerLevelMin ?? ""}
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
                          value={filters.playerLevelMax ?? ""}
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 56, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t px-4 bg-sidebar overflow-hidden"
            >
              <div className="h-14 flex items-center w-full">
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
    </>
  );
};
