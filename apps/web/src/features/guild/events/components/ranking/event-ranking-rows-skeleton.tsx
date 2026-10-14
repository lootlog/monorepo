import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

const RANKING_SKELETON_ROWS = 20;

/** Stands in for the event's ranking: table rows, or tiles on phones. */
export const EventRankingRowsSkeleton = () => (
  <TableRowsSkeleton
    rows={RANKING_SKELETON_ROWS}
    withHeader
    mobileList={
      <CardListSkeleton
        rows={RANKING_SKELETON_ROWS}
        card={
          <div
            data-list-tile
            className={cn(
              "flex min-h-16 items-center gap-3 py-3",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            <Skeleton className="size-6 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <SkeletonLine className="h-3.5 w-28 max-w-full" />
              </div>
              <div className="text-xs">
                <SkeletonLine className="h-3 w-40 max-w-full" />
              </div>
            </div>
            <div className="shrink-0 text-sm">
              <SkeletonLine className="h-3.5 w-12" />
            </div>
          </div>
        }
      />
    }
  />
);
