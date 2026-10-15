import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { TablePaginationFooterSkeleton } from "@/components/ui/table-pagination-footer-skeleton";
import { StatsFiltersSkeleton } from "./components/stats-filters-skeleton";
import { StatsTableResults } from "./components/stats-table-results";
import type { ComponentProps, ReactNode } from "react";

type StatsTablePageSkeletonProps = {
  rowContent?: ComponentProps<typeof StatsTableResults>["rowContent"];
  /** Passed to `StatsTableResults` for pages that list tiles below `xl`. */
  mobileSkeleton?: ReactNode;
};

export const StatsTablePageSkeleton = ({
  rowContent,
  mobileSkeleton,
}: StatsTablePageSkeletonProps) => (
  <ResultsSurface
    search={<InlineSearchFieldSkeleton />}
    filters={<StatsFiltersSkeleton />}
    footer={<TablePaginationFooterSkeleton />}
  >
    <StatsTableResults
      isLoading
      rowContent={rowContent}
      mobileSkeleton={mobileSkeleton}
    >
      {null}
    </StatsTableResults>
  </ResultsSurface>
);
