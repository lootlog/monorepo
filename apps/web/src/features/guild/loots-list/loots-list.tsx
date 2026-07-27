import { LootsList } from "@/features/guild/loots-list/components/loots-list/loots-list";
import { LootsFiltersSidebar } from "@/features/guild/loots-list/components/loots-filters/loots-filters-sidebar";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { AnimatePresence, motion } from "framer-motion";
import { LootFiltersHeader } from "@/features/guild/loots-list/components/loots-filters/loot-filters-header";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lootlog/ui/components/sheet";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { useLocalStorage } from "usehooks-ts";
import { LootDetailsDialog } from "@/features/guild/loots-list/components/loots-list/loot-details-dialog";
import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGuildContext } from "@/hooks/context/use-guild-context";

const FILTERS_OPEN_KEY = "loots-filters-open";
const COMPACT_FILTERS_BREAKPOINT = 1100;

export const LootsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { world } = useGuildContext();
  const { hasActiveFilters } = useLootsFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const usesOverlayFilters = useMaxWidth(COMPACT_FILTERS_BREAKPOINT);
  const usesSideSheet = usesOverlayFilters && !isMobile;

  const handleOpenSidebar = () => {
    if (usesOverlayFilters) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }

    setIsFiltersOpen((prev) => !prev);
  };

  const filtersOpenForHeader = usesOverlayFilters
    ? isMobileFiltersOpen
    : isFiltersOpen;

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          shouldScaleBackground={false}
        >
          <DrawerContent className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden p-0">
            <DrawerHeader className="shrink-0 border-b px-4 py-3">
              <DrawerTitle>{t("loots.header.mobileFiltersTitle")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <LootsFiltersSidebar embedded />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {usesSideSheet && (
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetContent className="w-[min(400px,calc(100vw-12px))] gap-0 border-border bg-background p-0 sm:max-w-[400px]">
            <SheetHeader className="h-14 shrink-0 justify-center border-b border-border px-4 pr-12">
              <SheetTitle>{t("loots.header.mobileFiltersTitle")}</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <LootsFiltersSidebar embedded />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background">
        <div className="px-3 pt-3 pb-0">
          <LootFiltersHeader
            onToggleFilters={handleOpenSidebar}
            isFiltersOpen={filtersOpenForHeader}
            isCompactLayout={usesOverlayFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-3">
            <LootsList />
          </div>

          {!usesOverlayFilters && (
            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
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

      {isMobile && world && (
        <Button
          onClick={handleOpenSidebar}
          size="icon"
          aria-label={t("loots.header.mobileFiltersTitle")}
          className="fixed bottom-4 right-4 z-20 h-12 w-12 rounded-xl border border-primary/30 shadow-lg"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}

      <LootDetailsDialog />
    </>
  );
};
