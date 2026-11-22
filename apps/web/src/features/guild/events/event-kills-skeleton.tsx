import { useParams } from "@tanstack/react-router";
import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { EventKillRowsSkeleton } from "./components/kills/event-kill-rows-skeleton";

export const EventKillsSkeleton = () => {
  const { heroId } = useParams({ strict: false });

  return (
    <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
      {!heroId && <EventHeaderSkeleton tab="kills" />}
      <SkeletonFilterBar />
      <EventKillRowsSkeleton />
    </div>
  );
};
