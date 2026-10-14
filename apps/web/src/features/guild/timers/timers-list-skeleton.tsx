import type { ViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  getTimerCellClassName,
  getTimerGroupClassName,
  TIMER_GROUP_HEADING_CLASS,
  TIMER_ROW_INSET_CLASS,
} from "./timers-layout";

const GROUP_SIZES = [3, 5];

/** Mirrors the timer list: the toolbar row, then group headings above `SingleTimer` rows. */
export const TimersListSkeleton = ({ viewMode }: { viewMode: ViewMode }) => (
  <div aria-hidden="true">
    <div
      data-list-tile
      className={cn(
        "flex min-h-12 items-center gap-2 border-b border-sidebar-border py-2",
        TIMER_ROW_INSET_CLASS,
      )}
    >
      <Skeleton className="size-4 shrink-0 rounded" />
      <Skeleton className="h-4 w-48" />
    </div>
    {GROUP_SIZES.map((size, groupIndex) => (
      <div key={groupIndex}>
        <div className={cn(TIMER_GROUP_HEADING_CLASS, TIMER_ROW_INSET_CLASS)}>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="overflow-hidden">
          <div className={getTimerGroupClassName(viewMode)}>
            {Array.from({ length: size }).map((_, index) => (
              <div
                key={index}
                data-list-tile
                className={cn(
                  getTimerCellClassName(viewMode),
                  TIMER_ROW_INSET_CLASS,
                  "flex items-center gap-3 py-2.5",
                )}
              >
                <Skeleton className="h-10 w-8 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);
