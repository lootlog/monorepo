import { cn } from "cn";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BattlePanelTeamColumnSkeleton } from "./battle-panel-team-column-skeleton";

export const BattlePanelBattleCardSkeleton = () => {
  return (
    <div
      aria-hidden="true"
      data-list-tile
      className={cn("py-3", LIST_TILE_RULE_CLASS, LIST_TILE_INSET_CLASS)}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-5 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="h-5.5 w-12 rounded-full" />
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="size-8 rounded-md" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <BattlePanelTeamColumnSkeleton />
        <BattlePanelTeamColumnSkeleton />
      </div>
    </div>
  );
};
