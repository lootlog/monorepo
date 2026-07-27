import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ReservationCardSkeleton } from "./reservation-card-skeleton";

export const ReservationsPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-3 border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ReservationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};
