import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type CardGridSkeletonProps = {
  count?: number;
  columns?: string;
};

export const CardGridSkeleton: FC<CardGridSkeletonProps> = ({
  count = 8,
  columns = "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
}) => {
  return (
    <div className={`grid grid-cols-1 gap-3 ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-48" />
          </div>
        </Card>
      ))}
    </div>
  );
};
