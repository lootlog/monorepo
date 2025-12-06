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
  const { hasActiveFilters } = useLootsFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const skipFirstAnimationRef = useRef(isFiltersOpen);
  const isMobile = useIsMobile();

  const handleOpenSidebar = () => {
    if (isMobile) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }

    setIsFiltersOpen((prev) => !prev);
  };

  useEffect(() => {
    if (skipFirstAnimationRef.current) {
      skipFirstAnimationRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsFiltersOpen(false);
      return;
    }

    setIsMobileFiltersOpen(false);
  }, [isMobile, setIsFiltersOpen]);

  const filtersOpenForHeader = isMobile ? isMobileFiltersOpen : isFiltersOpen;

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle>Filtry łupów</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <LootsFiltersSidebar className="w-full border-l-0 h-full" />
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
                  <LootsFiltersSidebar />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
};
