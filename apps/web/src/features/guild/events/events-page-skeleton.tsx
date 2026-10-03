import { FilterBar } from "@/components/common/filter-bar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { EventListCardSkeleton } from "./event-list-card-skeleton";

export const EventsPageSkeleton = () => (
  <div aria-busy="true" className="flex h-full min-h-0 flex-col">
    <div className="px-3 pt-3">
      <FilterBar>
        <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-md sm:w-36" />
      </FilterBar>
    </div>
    <div className="flex flex-col gap-2 px-3 py-3">
      {Array.from({ length: 4 }, (_, index) => (
        <EventListCardSkeleton key={index} />
      ))}
    </div>
  </div>
);
