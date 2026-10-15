import { Skeleton } from "@lootlog/ui/components/skeleton";

/** The filters of a stats page's filter bar, still loading; narrow pages move them to a panel. */
export const StatsFiltersSkeleton = () => (
  <>
    <Skeleton
      aria-hidden="true"
      className="hidden h-10 w-[200px] rounded-lg xl:block"
    />
    <Skeleton
      aria-hidden="true"
      className="hidden h-10 w-[200px] rounded-lg xl:block"
    />
    <Skeleton
      aria-hidden="true"
      className="hidden h-10 w-[200px] rounded-lg xl:block"
    />
  </>
);
