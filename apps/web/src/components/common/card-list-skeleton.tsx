import { Fragment, type ReactNode } from "react";

type CardListSkeletonProps = {
  card: ReactNode;
  rows?: number;
};

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
