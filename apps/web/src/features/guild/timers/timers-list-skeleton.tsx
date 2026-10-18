import type { ViewMode } from "@/hooks/use-view-mode";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { getTimerCellClassName, getTimerGroupClassName } from "./timers-layout";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";

const GROUP_SIZES = [3, 5];

/** Mirrors the timer list: the toolbar row, then group headings above `SingleTimer` rows. */
export const TimersListSkeleton = ({
  viewMode,
  canChooseViewMode,
}: {
  viewMode: ViewMode;
  canChooseViewMode: boolean;
}) => (
  <div aria-hidden="true">
    <ListToolbarSkeleton>
      {canChooseViewMode && <Skeleton className="h-8 w-16 rounded-lg" />}
    </ListToolbarSkeleton>
    {GROUP_SIZES.map((size, groupIndex) => (
      <div key={groupIndex}>
        <div className={cn(LIST_GROUP_HEADING_CLASS, LIST_TILE_INSET_CLASS)}>
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
                  LIST_TILE_INSET_CLASS,
                  "flex items-center gap-3 py-2.5",
                )}
              >
                <Skeleton className="h-10 w-8 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);
