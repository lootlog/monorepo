import { Fragment, type ReactNode } from "react";

type CardListSkeletonProps = {
  /** One card placeholder, repeated for every row. */
  card: ReactNode;
  rows?: number;
};

/** Stands in for a mobile results list of edge-to-edge tiles. */
export const CardListSkeleton = ({
  card,
  rows = 10,
}: CardListSkeletonProps) => (
  <div aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <Fragment key={index}>{card}</Fragment>
    ))}
  </div>
);
