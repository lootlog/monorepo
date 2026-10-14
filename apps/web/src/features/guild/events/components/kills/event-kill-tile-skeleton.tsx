import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

type EventKillTileSkeletonProps = {
  /** The tile ends with a button, such as the member's points breakdown toggle. */
  withAction?: boolean;
};

/** Stands in for one kill tile on phones. */
export const EventKillTileSkeleton = ({
  withAction = false,
}: EventKillTileSkeletonProps) => (
  <div
    data-list-tile
    className={cn(
      "flex h-16 items-center gap-3",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <div className="w-6 shrink-0 text-xs">
      <SkeletonLine className="h-3 w-4" />
    </div>
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Skeleton className="h-10 w-8 shrink-0 rounded-lg" />
      <div className="min-w-0">
        <div className="text-sm">
          <SkeletonLine className="h-3.5 w-28 max-w-full" />
        </div>
        <div className="mt-0.5 text-[10px]">
          <SkeletonLine className="h-2.5 w-20" />
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <div className="text-sm">
        <SkeletonLine className="h-3.5 w-10" />
      </div>
      <div className="text-xs">
        <SkeletonLine className="h-3 w-16" />
      </div>
    </div>
    {withAction && <Skeleton className="size-8 shrink-0 rounded-md" />}
  </div>
);
