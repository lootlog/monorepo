import { Skeleton } from "@lootlog/ui/components/skeleton";

/** The controls of a stats page's filter bar, still loading. */
export const StatsFiltersSkeleton = () => (
  <>
    <Skeleton className="h-10 w-full rounded-lg md:w-[200px]" />
    <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
    <Skeleton className="hidden h-10 w-[200px] rounded-lg md:block" />
  </>
);
