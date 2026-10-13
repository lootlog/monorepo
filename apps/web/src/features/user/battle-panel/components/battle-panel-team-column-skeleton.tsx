import { SkeletonLine } from "@/components/common/skeleton-line";
import { BattlePanelWarriorSkeleton } from "./battle-panel-warrior-skeleton";

/** Stands in for a battle card's team column: its label above a warrior row. */
export const BattlePanelTeamColumnSkeleton = () => (
  <div className="min-w-0">
    <div className="mb-1 text-[11px]">
      <SkeletonLine className="h-2.5 w-20" />
    </div>
    <BattlePanelWarriorSkeleton />
  </div>
);
