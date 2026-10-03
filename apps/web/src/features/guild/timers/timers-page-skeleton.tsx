import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useViewMode } from "@/hooks/use-view-mode";
import { TimersListSkeleton } from "./timers-list-skeleton";
import { TIMERS_VIEW_MODE_KEY } from "./timers-layout";

/** Route-level stand-in for the timers page: its filter bar above timer rows. */
export const TimersPageSkeleton = () => {
  const { viewMode } = useViewMode(TIMERS_VIEW_MODE_KEY, "list");

  return (
    <div aria-busy="true" className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-3">
        <FilterBar>
          <Skeleton className="h-10 min-w-0 basis-full rounded-xl sm:flex-1 sm:basis-0" />
          <Skeleton className="h-10 w-[140px] rounded-xl md:w-[200px]" />
          <Skeleton className="h-10 w-[4.5rem] rounded-xl" />
        </FilterBar>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <TimersListSkeleton viewMode={viewMode} />
      </div>
    </div>
  );
};
