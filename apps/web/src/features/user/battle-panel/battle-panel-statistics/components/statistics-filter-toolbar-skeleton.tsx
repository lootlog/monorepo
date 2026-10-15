import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

type StatisticsFilterToolbarSkeletonProps = {
  /** Leaves out the character selector, like a page fixed to one character. */
  withCharacter?: boolean;
};

/** Stands in for `StatisticsFilterToolbar`, which narrow pages move to a panel. */
export const StatisticsFilterToolbarSkeleton = ({
  withCharacter = true,
}: StatisticsFilterToolbarSkeletonProps) => {
  const widths = withCharacter
    ? ["w-[220px]", "w-[170px]", "w-[94px]"]
    : ["w-[170px]", "w-[94px]"];

  return widths.map((width) => (
    <Skeleton
      key={width}
      aria-hidden="true"
      className={cn("hidden h-10 rounded-lg xl:block", width)}
    />
  ));
};
