import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type StatCardsSkeletonProps = {
  count?: number;
};

export const StatCardsSkeleton: FC<StatCardsSkeletonProps> = ({
  count = 4,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border bg-card/40 p-4 backdrop-blur-sm">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </Card>
      ))}
    </div>
  );
};
