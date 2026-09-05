import { Skeleton } from "@lootlog/ui/components/skeleton";

export const StatsRankingRowsSkeleton = () => (
  <div>
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="flex h-14 items-center gap-4 border-b border-border px-4"
      >
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        {Array.from({ length: 4 }).map((_, j) => (
          <Skeleton key={j} className="h-4 w-12" />
        ))}
      </div>
    ))}
  </div>
);
