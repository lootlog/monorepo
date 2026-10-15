import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import type { ComponentProps } from "react";
import { StatsTablePageSkeleton } from "./stats-table-page-skeleton";

type StatsDetailPageSkeletonProps = Pick<
  ComponentProps<typeof StatsTablePageSkeleton>,
  "rowContent"
>;

/** Stands in for a member's or monster's stats page: its details row and table. */
export const StatsDetailPageSkeleton = ({
  rowContent,
}: StatsDetailPageSkeletonProps) => (
  <DetailSkeleton
    meta={
      <>
        <span className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-28" />
        </span>
        <span className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-20" />
        </span>
      </>
    }
  >
    <StatsTablePageSkeleton rowContent={rowContent} />
  </DetailSkeleton>
);
