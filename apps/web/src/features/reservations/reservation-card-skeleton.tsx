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
      <Card className="flex flex-row items-center gap-4 p-3 bg-card/40 backdrop-blur-sm border-border">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-8 rounded-lg" />
          <Skeleton className="h-10 w-8 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between p-4 bg-card/40 backdrop-blur-sm border-border h-full">
      <div className="flex flex-wrap gap-3 items-center">
        <Skeleton className="h-10 w-8 rounded-lg" />
        <Skeleton className="h-10 w-8 rounded-lg" />
        <Skeleton className="h-10 w-8 rounded-lg" />
      </div>
      <div className="mt-auto space-y-2 pt-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-48" />
      </div>
    </Card>
  );
};
