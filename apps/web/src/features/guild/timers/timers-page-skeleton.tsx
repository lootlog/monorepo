import { useViewMode } from "@/hooks/use-view-mode";
import { TimersListSkeleton } from "./timers-list-skeleton";
import { TIMERS_GRID_MEDIA_QUERY, TIMERS_VIEW_MODE_KEY } from "./timers-layout";

/** Route-level stand-in for the timers page: grouped timer rows. */
export const TimersPageSkeleton = () => {
  const { viewMode, canChooseViewMode } = useViewMode(
    TIMERS_VIEW_MODE_KEY,
    "list",
    TIMERS_GRID_MEDIA_QUERY,
  );

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
      <TimersListSkeleton
        viewMode={viewMode}
        canChooseViewMode={canChooseViewMode}
      />
    </div>
  );
};
