import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { EventListCardSkeleton } from "./event-list-card-skeleton";

export const EventsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <FilterBar search={<InlineSearchFieldSkeleton />}>
      <Skeleton className="h-8 w-32 rounded-control" />
    </FilterBar>
    {Array.from({ length: 4 }, (_, index) => (
      <EventListCardSkeleton key={index} />
    ))}
  </div>
);
