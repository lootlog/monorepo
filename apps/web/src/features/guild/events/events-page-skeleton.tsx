import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { EventListCardSkeleton } from "./event-list-card-skeleton";

/** Route-level stand-in for the events page: its toolbar above the rows. */
export const EventsPageSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <ListToolbarSkeleton>
      <Skeleton className="h-8 w-32 rounded-lg" />
    </ListToolbarSkeleton>
    {Array.from({ length: 4 }, (_, index) => (
      <EventListCardSkeleton key={index} />
    ))}
  </div>
);
