import { cn } from "cn";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BattlePanelWarriorSkeleton } from "./battle-panel-warrior-skeleton";

type BattlePanelH2hCardSkeletonProps = {
  /** Mirrors `BattlePanelH2hCard`'s `showRatingDelta` row. */
  withRatingDelta?: boolean;
};

/** Stands in for one `BattlePanelH2hCard`. */
export const BattlePanelH2hCardSkeleton = ({
  withRatingDelta = false,
}: BattlePanelH2hCardSkeletonProps) => (
  <div
    data-list-tile
    className={cn("py-3", LIST_TILE_RULE_CLASS, LIST_TILE_INSET_CLASS)}
  >
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-6 w-20 rounded-md" />
      <div className="text-xs">
        <SkeletonLine className="h-3 w-16" />
      </div>
    </div>
    <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
      <BattlePanelWarriorSkeleton />
      <div className="flex shrink-0 flex-col items-end">
        <div className="text-sm">
          <SkeletonLine className="h-3.5 w-12" />
        </div>
        <div className="text-[11px]">
          <SkeletonLine className="h-2.5 w-14" />
        </div>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col items-center p-2">
          <SkeletonLine className="h-3 w-6" />
          <SkeletonLine className="h-3 w-12" />
        </div>
      ))}
    </div>
    {withRatingDelta && (
      <div className="mt-2 p-2 text-xs">
        <SkeletonLine className="h-3 w-36" />
      </div>
    )}
  </div>
);
