import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";

export const SkeletonFilterBar = () => (
  <FilterBar search={<InlineSearchFieldSkeleton />} />
);
