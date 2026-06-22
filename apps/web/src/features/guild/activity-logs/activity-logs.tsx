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
import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getActivitiesControllerSuggestWorldsQueryKey,
  getActivitiesControllerSuggestWorldsQueryOptions,
} from "@/lib/api/generated/activity/guilds/guilds";
import { useTranslation } from "react-i18next";

const FILTERS_OPEN_KEY = "activity-logs-filters-open";

export const ActivityLogs: FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({
    from: "/_authenticated/$guildId/activity-logs",
  });
  const { filters, setFilters, hasActiveFilters } = useActivityLogsFilters();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const hasGuildId = Boolean(guildId);

  const { data: worldSuggestionsResponse } = useQuery(
    getActivitiesControllerSuggestWorldsQueryOptions(
      { guildId: guildId ?? "" },
      { limit: 20 },
      {
        query: {
          enabled: hasGuildId,
          queryKey: getActivitiesControllerSuggestWorldsQueryKey(
            { guildId: guildId ?? "" },
            { limit: 20 },
          ),
          staleTime: 5 * 60 * 1000,
        },
      },
    ),
  );
  const worldSuggestions = worldSuggestionsResponse?.worlds ?? [];

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
              <DrawerTitle>{t("activityLogs.filters.title")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ActivityLogsFiltersSidebar className="w-full border-l-0 h-full p-0" />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background/50">
        <div className="px-3 pt-3 pb-0">
          <ActivityLogsFiltersHeader
            onToggleFilters={handleOpenSidebar}
            isFiltersOpen={filtersOpenForHeader}
            hasActiveFilters={hasActiveFilters}
            worldOptions={worldOptions}
            selectedWorld={filters.world ?? ""}
            onWorldChange={handleWorldChange}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-3">
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
                  className="overflow-hidden h-full"
                >
                  <ActivityLogsFiltersSidebar />
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
    </>
  );
};
