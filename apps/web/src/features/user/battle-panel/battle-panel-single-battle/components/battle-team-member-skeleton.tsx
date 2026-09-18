import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattleTeamMemberSkeleton = () => (
  <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-background/40 py-1 pl-1.5 pr-2.5">
    <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
    <div className="min-w-0 space-y-1.5">
      <Skeleton className="h-3 w-20" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="size-4 rounded-full" />
      </div>
    </div>
  </div>
);
