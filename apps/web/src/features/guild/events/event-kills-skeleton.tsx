import { useParams } from "@tanstack/react-router";
import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";
import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { EventKillRowsSkeleton } from "./components/kills/event-kill-rows-skeleton";

/**
 * Route-level stand-in for a kill history: its hero tabs above the kills. The
 * event's history opens under the event's tabs; a hero's opens from its page.
 */
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
