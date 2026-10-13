import type { ComponentProps } from "react";
import { StatsTablePageSkeleton } from "./stats-table-page-skeleton";

type StatsDetailPageSkeletonProps = Pick<
  ComponentProps<typeof StatsTablePageSkeleton>,
  "rowContent"
>;

export const StatsDetailPageSkeleton = ({
  rowContent,
}: StatsDetailPageSkeletonProps) => (
  <StatsTablePageSkeleton withHeader rowContent={rowContent} />
);
