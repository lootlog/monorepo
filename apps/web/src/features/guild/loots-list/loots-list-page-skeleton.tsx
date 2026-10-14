import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { useLocalStorage } from "usehooks-ts";
import { useViewMode } from "@/hooks/use-view-mode";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "cn";
import { LootFiltersRailSkeleton } from "./components/loots-filters/loot-filters-rail-skeleton";
import { LootsFiltersSidebarSkeleton } from "./components/loots-filters/loots-filters-sidebar-skeleton";
import { LootsListSkeleton } from "./components/loots-list/loots-list-skeleton";
import {
  LOOTS_COMPACT_FILTERS_BREAKPOINT,
  LOOTS_FILTERS_OPEN_KEY,
  LOOTS_GRID_MEDIA_QUERY,
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
  const isPanelDocked = !usesOverlayFilters && isFiltersOpen;

  const { viewMode } = useViewMode(
    LOOTS_VIEW_MODE_KEY,
    "grid",
    LOOTS_GRID_MEDIA_QUERY,
  );

  return (
    <div
      aria-busy="true"
      className="flex h-full w-full flex-col overflow-hidden"
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
