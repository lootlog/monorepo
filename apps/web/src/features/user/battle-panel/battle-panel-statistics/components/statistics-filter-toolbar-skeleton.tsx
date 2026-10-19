import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

const FILTER_WIDTHS = ["w-[170px]", "w-[94px]"];

/** Stands in for `StatisticsFilterToolbar`, which narrow pages move to a panel. */
export const StatisticsFilterToolbarSkeleton = () =>
  FILTER_WIDTHS.map((width) => (
    <Skeleton
      key={width}
      aria-hidden="true"
      className={cn("hidden h-10 rounded-lg xl:block", width)}
    />
  ));
