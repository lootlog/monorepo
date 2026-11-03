import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { HeroSightingsResultsSkeleton } from "./hero-sightings-results-skeleton";

/** Route-level stand-in for the hero sightings page: its search above the board. */
export const HeroSightingsPageSkeleton = () => (
  <div className="min-h-0 flex-1 overflow-hidden">
    <FilterBar search={<InlineSearchFieldSkeleton />} />
    <HeroSightingsResultsSkeleton />
  </div>
);
