import { useViewMode } from "@/hooks/use-view-mode";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TimersListSkeleton } from "./timers-list-skeleton";
import { TIMERS_GRID_MEDIA_QUERY, TIMERS_VIEW_MODE_KEY } from "./timers-layout";

export const TimersPageSkeleton = () => {
  const { viewMode, canChooseViewMode } = useViewMode(
    TIMERS_VIEW_MODE_KEY,
    "list",
    TIMERS_GRID_MEDIA_QUERY,
  );

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
      <FilterBar search={<InlineSearchFieldSkeleton />}>
        {canChooseViewMode && <Skeleton className="h-8 w-16 rounded-lg" />}
      </FilterBar>
      <TimersListSkeleton viewMode={viewMode} />
    </div>
  );
};
