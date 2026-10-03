import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type EventListCardSkeletonProps = {
  canDeleteEvent?: boolean;
};

/** Stands in for an `EventListCard` with the same layout. */
export const EventListCardSkeleton = ({
  canDeleteEvent = false,
}: EventListCardSkeletonProps) => (
  <SectionCard className="flex-row items-stretch overflow-hidden">
    <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1 border-l border-border px-2">
      <Skeleton className="size-8 rounded-lg" />
      {canDeleteEvent && <Skeleton className="size-8 rounded-lg" />}
    </div>
  </SectionCard>
);
