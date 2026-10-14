import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { EventKillRowsSkeleton } from "./components/kills/event-kill-rows-skeleton";

/** Route-level stand-in for the event's kill history: its hero tabs above the kills. */
export const EventKillsSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <SkeletonFilterBar />
    <EventKillRowsSkeleton />
  </div>
);
