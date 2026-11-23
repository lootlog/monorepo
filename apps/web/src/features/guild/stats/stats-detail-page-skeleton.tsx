import { DetailBarFact } from "@/components/common/detail-bar-fact";
import { DetailBarFacts } from "@/components/common/detail-bar-facts";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import type { ComponentProps } from "react";
import { StatsTablePageSkeleton } from "./stats-table-page-skeleton";

type StatsDetailPageSkeletonProps = Pick<
  ComponentProps<typeof StatsTablePageSkeleton>,
  "rowContent" | "mobileSkeleton"
>;

export const StatsDetailPageSkeleton = ({
  rowContent,
  mobileSkeleton,
}: StatsDetailPageSkeletonProps) => (
  <DetailSkeleton
    meta={
      <DetailBarFacts>
        {Array.from({ length: 3 }, (_, index) => (
          <DetailBarFact key={index} label="">
            <SkeletonLine className="h-3.5 w-20" />
          </DetailBarFact>
        ))}
      </DetailBarFacts>
    }
  >
    <StatsTablePageSkeleton
      rowContent={rowContent}
      mobileSkeleton={mobileSkeleton}
    />
  </DetailSkeleton>
);
