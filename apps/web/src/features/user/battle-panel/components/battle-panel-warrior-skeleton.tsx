import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Stands in for a 36px warrior row: a scaled player sprite beside its name and level. */
export const BattlePanelWarriorSkeleton = () => (
  <div className="flex min-w-0 items-center gap-2">
    <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
    <div className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-2.5 w-10" />
    </div>
  </div>
);
