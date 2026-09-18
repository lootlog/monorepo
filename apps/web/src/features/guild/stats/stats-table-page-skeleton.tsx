import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { StatsFilterBarSkeleton } from "./components/stats-filter-bar-skeleton";
import { StatsTableCard } from "./components/stats-table-card";

type StatsTablePageSkeletonProps = {
  /** Detail pages open with a header card and have no navigation above them. */
  withHeader?: boolean;
};

export const StatsTablePageSkeleton = ({
  withHeader = false,
}: StatsTablePageSkeletonProps) => (
  <div
    className={
      withHeader
        ? "flex h-full min-h-0 flex-col gap-3 bg-background p-3"
        : "flex h-full min-h-0 flex-col gap-3 bg-background px-3 pb-3"
    }
  >
    {withHeader && (
      <SectionCard className="shrink-0">
        <div className="flex items-center gap-3 p-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-10 w-48 md:block" />
        </div>
      </SectionCard>
    )}
    <StatsFilterBarSkeleton />
    <StatsTableCard isLoading>{null}</StatsTableCard>
  </div>
);
