import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { EventRankingRowsSkeleton } from "./components/ranking/event-ranking-rows-skeleton";

/** Route-level stand-in for the event's ranking: its hero tabs above the members. */
export const EventRankingSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <EventHeaderSkeleton tab="ranking" />
    <SkeletonFilterBar />
    <EventRankingRowsSkeleton />
  </div>
);
