import type { ViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { getTimerGroupClassName } from "./timers-layout";

const GROUP_SIZES = [3, 5];

/** Mirrors the grouped timer rows: a group heading above `SingleTimer` rows. */
export const TimersListSkeleton = ({ viewMode }: { viewMode: ViewMode }) => (
  <div aria-hidden="true" className="flex flex-col gap-4 px-3 pb-3">
    {GROUP_SIZES.map((size, groupIndex) => (
      <div key={groupIndex}>
        <Skeleton className="mx-1 mb-2 h-4 w-20" />
        <div className={getTimerGroupClassName(viewMode)}>
          {Array.from({ length: size }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5"
            >
              <Skeleton className="size-8 shrink-0 rounded" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
