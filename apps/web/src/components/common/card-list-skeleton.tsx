import { Fragment, type ReactNode } from "react";

type CardListSkeletonProps = {
  /** One card placeholder, repeated for every row. */
  card: ReactNode;
  rows?: number;
};

/** Stands in for a mobile results list that stacks cards in a padded grid. */
export const CardListSkeleton = ({
  card,
  rows = 10,
}: CardListSkeletonProps) => (
  <div aria-hidden="true" className="grid gap-2 p-3">
    {Array.from({ length: rows }, (_, index) => (
      <Fragment key={index}>{card}</Fragment>
    ))}
  </div>
);
