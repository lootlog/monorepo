import { Accordion } from "@lootlog/ui/components/accordion";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Bookmark, Plus, X } from "lucide-react";
import { LootDirectSearchNotice } from "./loot-direct-search-notice";
import { LootItemFilters } from "./loot-item-filters";
import { LootNpcFilters } from "./loot-npc-filters";
import { LootPlayerFilters } from "./loot-player-filters";

const embeddedValue = <Value,>(
  embedded: boolean,
  embeddedValue: Value,
  sidebarValue: Value,
) => (embedded ? embeddedValue : sidebarValue);

import { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

export const LootsFiltersSidebar = (
  props: Parameters<typeof useLootFiltersSidebar>[0],
) => {
  const {
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
    npcsSearchError,
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
    itemsSearchError,
    hidItem,
    playerActiveFilterCount,
    playerHits,
    playersSearchValue,
    setPlayersSearchValue,
    isPlayersSearching,
    playersSearchError,
    hasActiveFilters,
    clearFilters,
  } = useLootFiltersSidebar(props);

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
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
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
          "h-full flex shrink-0 flex-col",
          embeddedValue(
            embedded,
            "w-full p-0 bg-background",
            "w-[340px] py-3 pr-3",
          ),
          className,
        )}
      >
        <div
          data-slot="filters-panel"
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
                        variant="default"
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
                      <div
                        key={filter.id}
                        className="group flex items-center gap-1"
                      >
                        <Button
                          type="button"
                          variant={
                            isQuickFilterApplied(filter.filters)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => applyFilter(filter.filters)}
                          aria-pressed={isQuickFilterApplied(filter.filters)}
                        >
                          {"category" in filter && (
                            <span className="text-xs opacity-80">
                              {filter.category}:
                            </span>
                          )}
                          {filter.label}
                        </Button>
                        {!("isDefault" in filter && filter.isDefault) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("common.removeOption", {
                              label: filter.label,
                            })}
                            className="size-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            onClick={() => handleRemoveCustomFilter(filter.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {filters.search !== "" && (
                  <div className="border-b border-border/70 p-3 sm:p-4">
                    <LootDirectSearchNotice
                      term={filters.search}
                      onClear={() => updateFilters({ search: "" })}
                    />
                  </div>
                )}

                <Accordion multiple defaultValue={["npc", "item", "player"]}>
                  <LootNpcFilters
                    t={t}
                    npcActiveFilterCount={npcActiveFilterCount}
                    npcTypeOptions={npcTypeOptions}
                    selectedNpcTypes={selectedNpcTypes}
                    filters={filters}
                    updateFilters={updateFilters}
                    npcHits={npcHits}
                    npcsSearchValue={npcsSearchValue}
                    setNpcsSearchValue={setNpcsSearchValue}
                    isNpcsSearching={isNpcsSearching}
                    npcsSearchError={npcsSearchError}
                    levelRanges={levelRanges}
                  />

                  <LootItemFilters
                    t={t}
                    itemActiveFilterCount={itemActiveFilterCount}
                    rarityOptions={rarityOptions}
                    selectedRarities={selectedRarities}
                    filters={filters}
                    updateFilters={updateFilters}
                    professionOptions={professionOptions}
                    selectedProfessions={selectedProfessions}
                    itemHits={itemHits}
                    itemsSearchValue={itemsSearchValue}
                    setItemsSearchValue={setItemsSearchValue}
                    isItemsSearching={isItemsSearching}
                    itemsSearchError={itemsSearchError}
                    hidItem={hidItem}
                    levelRanges={levelRanges}
                  />

                  <LootPlayerFilters
                    t={t}
                    playerActiveFilterCount={playerActiveFilterCount}
                    filters={filters}
                    updateFilters={updateFilters}
                    playerHits={playerHits}
                    playersSearchValue={playersSearchValue}
                    setPlayersSearchValue={setPlayersSearchValue}
                    isPlayersSearching={isPlayersSearching}
                    playersSearchError={playersSearchError}
                    levelRanges={levelRanges}
                  />
                </Accordion>
              </div>
            </ScrollArea>
          </div>

          <AnimatePresence>
            {hasActiveFilters && (
              <m.div
                layout
                initial={{ opacity: 0, scaleY: 0.96 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.96 }}
                style={{ transformOrigin: "bottom" }}
                data-slot="filters-panel-footer"
                className="overflow-hidden border-t border-border bg-filters-sidebar px-3"
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
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
