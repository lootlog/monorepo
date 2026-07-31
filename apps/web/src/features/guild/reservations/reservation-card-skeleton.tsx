import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type ReservationCardSkeletonProps = {
  viewMode?: "list" | "grid";
};

export const ReservationCardSkeleton: FC<ReservationCardSkeletonProps> = ({
  viewMode = "grid",
}) => {
  if (viewMode === "list") {
    return (
      <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 border-border bg-card p-3 sm:grid-cols-[12rem_9.5rem_minmax(0,1fr)_13rem_auto]">
        <div className="col-start-1 row-start-1 flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
        <div className="col-span-2 col-start-1 row-start-2 flex items-center gap-2 overflow-hidden sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <Skeleton className="h-10 w-8 rounded-lg" />
          <Skeleton className="h-10 w-8 rounded-lg" />
          <Skeleton className="h-10 w-8 rounded-lg" />
        </div>
        <Skeleton className="col-span-2 col-start-1 row-start-3 h-12 w-full rounded-lg sm:col-span-1 sm:col-start-4 sm:row-start-1" />
        <Skeleton className="col-start-2 row-start-1 size-4 rounded-sm sm:col-start-5" />
      </Card>
    );
  }

  return (
    <Card className="flex min-h-40 h-full flex-col gap-3 border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-8 rounded-lg" />
        <Skeleton className="h-10 w-8 rounded-lg" />
        <Skeleton className="h-10 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-auto h-12 w-full rounded-lg" />
    </Card>
  );
};
