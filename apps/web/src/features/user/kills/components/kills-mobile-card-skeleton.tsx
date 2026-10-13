import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Stands in for one `KillsMobileList` card. */
export const KillsMobileCardSkeleton = () => (
  <div className="border-b border-border/70 p-3 last:border-b-0">
    <div className="flex min-w-0 items-start gap-3">
      <Skeleton className="size-8 shrink-0 rounded-md" />
      <Skeleton className="h-10 w-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <SkeletonLine className="h-3.5 w-32 max-w-full" />
        </div>
        <div className="mt-1 flex gap-1.5">
          <Skeleton className="h-5.5 w-16 rounded-full" />
          <Skeleton className="h-5.5 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className="text-base">
          <SkeletonLine className="h-4 w-8" />
        </div>
        <div className="text-xs">
          <SkeletonLine className="h-3 w-10" />
        </div>
      </div>
    </div>
  </div>
);
