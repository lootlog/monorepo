import { useLocalStorage, useMediaQuery } from "usehooks-ts";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { useViewMode } from "@/hooks/use-view-mode";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "cn";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { LootFiltersRailSkeleton } from "./components/loots-filters/loot-filters-rail-skeleton";
import { LootsFiltersSidebarSkeleton } from "./components/loots-filters/loots-filters-sidebar-skeleton";
import { LootsListSkeleton } from "./components/loots-list/loots-list-skeleton";
import {
  LOOTS_FILTERS_OPEN_KEY,
  LOOTS_VIEW_MODE_KEY,
} from "./loots-list-layout";

export const LootsListPageSkeleton = () => {
  const isMobile = useIsMobile();
  const usesOverlayFilters = !useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const [isFiltersOpen] = useLocalStorage(LOOTS_FILTERS_OPEN_KEY, true);
  const isPanelDocked = !usesOverlayFilters && isFiltersOpen;

  const { viewMode, canChooseViewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    RESULTS_TABLE_MEDIA_QUERY,
  );

  return (
    <div
      aria-busy="true"
      className="flex h-full w-full flex-col overflow-hidden"
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FilterBar search={<InlineSearchFieldSkeleton />}>
            {canChooseViewMode && <Skeleton className="h-8 w-16 rounded-lg" />}
          </FilterBar>
          <LootsListSkeleton viewMode={viewMode} />
        </div>
        {!isMobile && (
          <div
            data-top-bar-inset
            className={cn(
              "h-full shrink-0 overflow-hidden border-l border-sidebar-border bg-sidebar",
              isPanelDocked ? "w-[340px]" : "w-14",
            )}
          >
            {isPanelDocked ? (
              <LootsFiltersSidebarSkeleton />
            ) : (
              <LootFiltersRailSkeleton />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
