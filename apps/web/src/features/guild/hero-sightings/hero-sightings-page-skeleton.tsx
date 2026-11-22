import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { HeroSightingsResultsSkeleton } from "./hero-sightings-results-skeleton";

export const HeroSightingsPageSkeleton = () => (
  <div className="min-h-0 flex-1 overflow-hidden">
    <FilterBar search={<InlineSearchFieldSkeleton />} />
    <HeroSightingsResultsSkeleton />
  </div>
);
