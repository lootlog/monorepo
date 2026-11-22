import { Skeleton } from "@lootlog/ui/components/skeleton";

const FILTER_WIDTHS = ["w-[150px]", "w-[150px]", "w-[150px]", "w-[94px]"];

export const BattlesListFilterToolbarSkeleton = () =>
  FILTER_WIDTHS.map((width, index) => (
    <Skeleton
      key={index}
      aria-hidden="true"
      className={`hidden h-10 rounded-lg xl:block ${width}`}
    />
  ));
