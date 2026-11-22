import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const SkeletonFilterBar = () => (
  <FilterBar search={<Skeleton className="h-10 w-72 rounded-control" />} />
);
