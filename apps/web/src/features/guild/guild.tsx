import { LootsList } from "@/features/guild/components/loots-list/loots-list";
import { LootsFiltersSidebar } from "@/features/guild/components/loots-filters/loots-filters-sidebar";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { AnimatePresence, motion } from "framer-motion";
import { LootFiltersHeader } from "@/features/guild/components/loots-filters/loot-filters-header";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { LootDetailsDialog } from "@/features/guild/components/loots-list/loot-details-dialog";
import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

const FILTERS_OPEN_KEY = "loots-filters-open";

export const Guild: React.FC = () => {
  const { t } = useTranslation();
  const { hasActiveFilters } = useLootsFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleOpenSidebar = () => {
    if (isMobile) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }

    setIsFiltersOpen((prev) => !prev);
  };

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
              <DrawerTitle>{t("loots.header.mobileFiltersTitle")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <LootsFiltersSidebar className="w-full border-l-0 h-full p-0" />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background/50">
        <div className="px-3 pt-3 pb-0">
          <LootFiltersHeader
            onToggleFilters={handleOpenSidebar}
            isFiltersOpen={filtersOpenForHeader}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden py-3">
            <LootsList />
          </div>

          {!isMobile && (
            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden h-full"
                >
                  <LootsFiltersSidebar />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {isMobile && (
        <Button
          onClick={handleOpenSidebar}
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}

      <LootDetailsDialog />
    </>
  );
};
