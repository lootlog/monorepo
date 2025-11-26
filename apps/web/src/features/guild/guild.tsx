import { LootsList } from "@/features/guild/components/loots-list/loots-list";
import { LootsFiltersSidebar } from "@/features/guild/components/loots-filters/loots-filters-sidebar";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { AnimatePresence, motion } from "framer-motion";
import { LootFiltersHeader } from "@/features/guild/components/loots-filters/loot-filters-header";
import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";

const FILTERS_OPEN_KEY = "loots-filters-open";

export const Guild: React.FC = () => {
  const { filters, setFilters, hasActiveFilters, clearFilters } =
    useLootsFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<
    ReturnType<typeof useLootsFilters>["filters"]
  >(() => filters);
  const skipFirstAnimationRef = useRef(isFiltersOpen);
  const isMobile = useIsMobile();

  const handleOpenSidebar = () => {
    setTempFilters(filters);
    if (isMobile) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }

    setIsFiltersOpen((prev) => !prev);
  };

  const handleSaveFilters = (
    override?: Partial<ReturnType<typeof useLootsFilters>["filters"]>,
  ) => {
    const filtersToSave = {
      ...tempFilters,
      ...override,
    };

    setTempFilters(filtersToSave);
    setFilters({
      search: filtersToSave.search || null,
      npcTypes:
        filtersToSave.npcTypes.length > 0 ? filtersToSave.npcTypes : null,
      npcs: filtersToSave.npcs.length > 0 ? filtersToSave.npcs : null,
      npcLevelMin: filtersToSave.npcLevelMin || null,
      npcLevelMax: filtersToSave.npcLevelMax || null,
      rarities:
        filtersToSave.rarities.length > 0 ? filtersToSave.rarities : null,
      itemLevelMin: filtersToSave.itemLevelMin || null,
      itemLevelMax: filtersToSave.itemLevelMax || null,
      hid: filtersToSave.hid || null,
      itemNames:
        filtersToSave.itemNames.length > 0 ? filtersToSave.itemNames : null,
      players: filtersToSave.players.length > 0 ? filtersToSave.players : null,
      playerLevelMin: filtersToSave.playerLevelMin || null,
      playerLevelMax: filtersToSave.playerLevelMax || null,
      location: null,
    });
  };

  const handleClearFilters = () => {
    clearFilters();
    setTempFilters({
      search: "",
      npcTypes: [],
      npcs: [],
      npcLevelMin: "",
      npcLevelMax: "",
      rarities: [],
      itemLevelMin: "",
      itemLevelMax: "",
      hid: "",
      itemNames: [],
      players: [],
      playerLevelMin: "",
      playerLevelMax: "",
      location: "",
    });
  };

  useEffect(() => {
    if (skipFirstAnimationRef.current) {
      skipFirstAnimationRef.current = false;
    }
  }, []);

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (isMobile) {
      setIsFiltersOpen(false);
      return;
    }

    setIsMobileFiltersOpen(false);
  }, [isMobile, setIsFiltersOpen]);

  const sidebarFilters = {
    players: tempFilters.players,
    npcs: tempFilters.npcs,
    rarities: tempFilters.rarities,
    npcTypes: tempFilters.npcTypes,
    npcLevelMin: tempFilters.npcLevelMin,
    npcLevelMax: tempFilters.npcLevelMax,
    itemLevelMin: tempFilters.itemLevelMin,
    itemLevelMax: tempFilters.itemLevelMax,
    playerLevelMin: tempFilters.playerLevelMin,
    playerLevelMax: tempFilters.playerLevelMax,
    hid: tempFilters.hid,
    itemNames: tempFilters.itemNames,
  };

  const handleFilterChange = (newFilters: Partial<typeof sidebarFilters>) => {
    setTempFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleMobileSaveFilters = (
    override?: Partial<typeof sidebarFilters>,
  ) => {
    handleSaveFilters(override);
    setIsMobileFiltersOpen(false);
  };

  const filtersOpenForHeader = isMobile ? isMobileFiltersOpen : isFiltersOpen;

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileFiltersOpen}
          onOpenChange={(open) => {
            if (open) {
              setTempFilters(filters);
            }
            setIsMobileFiltersOpen(open);
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle>Filtry łupów</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <LootsFiltersSidebar
                className="w-full border-l-0 h-full"
                filters={sidebarFilters}
                onFilterChange={handleFilterChange}
                onSave={handleMobileSaveFilters}
                onClear={handleClearFilters}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden">
        <LootFiltersHeader
          onToggleFilters={handleOpenSidebar}
          isFiltersOpen={filtersOpenForHeader}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/20">
            <LootsList />
          </div>

          {!isMobile && (
            <AnimatePresence>
              {isFiltersOpen && (
                <motion.div
                  initial={
                    skipFirstAnimationRef.current
                      ? { width: 320, opacity: 1 }
                      : { width: 0, opacity: 0 }
                  }
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden h-full border-l border-border"
                >
                  <LootsFiltersSidebar
                    filters={sidebarFilters}
                    onFilterChange={handleFilterChange}
                    onSave={handleSaveFilters}
                    onClear={handleClearFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
};
