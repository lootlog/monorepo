import { cn } from "cn";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { StatsFilterBarSkeleton } from "./components/stats-filter-bar-skeleton";
import { StatsTableCard } from "./components/stats-table-card";
import type { ComponentProps, ReactNode } from "react";

type StatsTablePageSkeletonProps = {
  /** Detail pages open with a header card and have no navigation above them. */
  withHeader?: boolean;
  rowContent?: ComponentProps<typeof StatsTableCard>["rowContent"];
  /** Passed to `StatsTableCard` for pages that render a card list below `md`. */
  mobileSkeleton?: ReactNode;
};

export const StatsTablePageSkeleton = ({
  withHeader = false,
  rowContent,
  mobileSkeleton,
}: StatsTablePageSkeletonProps) => (
  <div
    // Under the stats tabs it fills the page; a member page has no tabs.
    data-fills-page={withHeader ? undefined : true}
    className={cn("flex min-h-0 flex-col gap-3 p-3", withHeader && "h-full")}
  >
    {withHeader && (
      <SectionCard className="shrink-0">
        <div className="flex items-center gap-3 p-4">
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
    <StatsTableCard
      isLoading
      rowContent={rowContent}
      mobileSkeleton={mobileSkeleton}
    >
      {null}
    </StatsTableCard>
  </div>
);
