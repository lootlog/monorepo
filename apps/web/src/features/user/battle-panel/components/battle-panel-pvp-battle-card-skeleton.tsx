import { cn } from "cn";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BattlePanelTeamColumnSkeleton } from "./battle-panel-team-column-skeleton";

/** Stands in for one `BattlePanelPvpBattleCard`. */
export const BattlePanelPvpBattleCardSkeleton = () => (
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
    <div className="mt-3 grid grid-cols-2 gap-3">
      <BattlePanelTeamColumnSkeleton />
      <BattlePanelTeamColumnSkeleton />
    </div>
    <div className="mt-3 flex items-end justify-between gap-3">
      <div className="text-[11px]">
        <SkeletonLine className="h-2.5 w-24" />
      </div>
      <div className="flex flex-col items-end">
        <div className="text-sm">
          <SkeletonLine className="h-3.5 w-8" />
        </div>
        <div className="text-[11px]">
          <SkeletonLine className="h-2.5 w-16" />
        </div>
      </div>
    </div>
  </div>
);
