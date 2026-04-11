import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export const TableSkeleton: FC<TableSkeletonProps> = ({
  rows = 10,
  columns = 5,
}) => {
  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center gap-4 border-b border-border px-4"
        >
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
};
