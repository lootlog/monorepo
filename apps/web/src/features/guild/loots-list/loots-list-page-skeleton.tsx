import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { useLocalStorage } from "usehooks-ts";
import { useViewMode } from "@/hooks/use-view-mode";
import { LootFiltersHeaderSkeleton } from "./components/loots-filters/loot-filters-header-skeleton";
import { LootsFiltersSidebarSkeleton } from "./components/loots-filters/loots-filters-sidebar-skeleton";
import { LootsListSkeleton } from "./components/loots-list/loots-list-skeleton";
import {
  LOOTS_COMPACT_FILTERS_BREAKPOINT,
  LOOTS_FILTERS_OPEN_KEY,
  LOOTS_VIEW_MODE_KEY,
} from "./loots-list-layout";

/**
 * Route-level placeholder laid out exactly like the loots page, reading the
 * same stored view mode and panel state so nothing jumps once data arrives.
 */
export const LootsListPageSkeleton = () => {
  const isMobile = useIsMobile();
  const usesOverlayFilters = useMaxWidth(LOOTS_COMPACT_FILTERS_BREAKPOINT);
  const [isFiltersOpen] = useLocalStorage(LOOTS_FILTERS_OPEN_KEY, true);
  const { viewMode } = useViewMode(LOOTS_VIEW_MODE_KEY);

  return (
    <div
      aria-busy="true"
      className="flex h-full w-full flex-col overflow-hidden bg-background"
    >
      <div className="px-3 pb-0 pt-3">
        <LootFiltersHeaderSkeleton
          isMobile={isMobile}
          isCompactLayout={usesOverlayFilters}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden pt-3">
          <LootsListSkeleton viewMode={viewMode} />
        </div>
        {!usesOverlayFilters && isFiltersOpen && (
          <LootsFiltersSidebarSkeleton />
        )}
      </div>
    </div>
  );
};
