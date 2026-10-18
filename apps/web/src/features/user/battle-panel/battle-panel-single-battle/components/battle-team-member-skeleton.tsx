import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattleTeamMemberSkeleton = () => (
  <div className="flex min-w-0 items-center gap-2">
    <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
    <div className="min-w-0 space-y-1.5">
      <SkeletonLine className="h-3.5 w-24" />
      <div className="flex items-center gap-1">
        <SkeletonLine className="h-3 w-8" />
        <Skeleton className="size-4 rounded-full" />
      </div>
    </div>
  </div>
);
