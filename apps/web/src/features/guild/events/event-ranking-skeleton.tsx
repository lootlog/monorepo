import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { EventRankingRowsSkeleton } from "./components/ranking/event-ranking-rows-skeleton";

export const EventRankingSkeleton = () => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <EventHeaderSkeleton tab="ranking" />
    <SkeletonFilterBar />
    <EventRankingRowsSkeleton />
  </div>
);
