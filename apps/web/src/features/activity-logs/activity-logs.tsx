import { ActivityLogsList } from "./components/activity-logs-list";
import { ActivityLogsFiltersSidebar } from "./components/activity-logs-filters-sidebar";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { AnimatePresence, motion } from "framer-motion";
import { ActivityLogsFiltersHeader } from "./components/activity-logs-filters-header";
import { useState, type FC } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { useActivityWorldSuggestions } from "@/hooks/api/activity-logs/use-activity-world-suggestions";
import { useGuild } from "@/hooks/api/guilds/use-guild";

const FILTERS_OPEN_KEY = "activity-logs-filters-open";

export const ActivityLogs: FC = () => {
  const { filters, setFilters, hasActiveFilters } = useActivityLogsFilters();
  const { data: guild } = useGuild();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: worldSuggestions = [] } = useActivityWorldSuggestions({
    guildId: guild?.id,
  });

  const handleOpenSidebar = () => {
    if (isMobile) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }

    setIsFiltersOpen((prev) => !prev);
  };

  const worldOptions = worldSuggestions.map((world) => ({
    value: world,
    label: world,
  }));

  const filtersOpenForHeader = isMobile ? isMobileFiltersOpen : isFiltersOpen;

  const handleWorldChange = (world: string) => {
    setFilters({
      world: world || null,
    });
  };

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
              <DrawerTitle>Filtry aktywności</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ActivityLogsFiltersSidebar className="w-full border-l-0 h-full" />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden">
        <ActivityLogsFiltersHeader
          onToggleFilters={handleOpenSidebar}
          isFiltersOpen={filtersOpenForHeader}
          hasActiveFilters={hasActiveFilters}
          worldOptions={worldOptions}
          selectedWorld={filters.world ?? ""}
          onWorldChange={handleWorldChange}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/20">
            <ActivityLogsList />
          </div>

          {!isMobile && (
            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden h-full border-l border-border"
                >
                  <ActivityLogsFiltersSidebar />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
};
