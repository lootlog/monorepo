import { Skeleton } from "@lootlog/ui/components/skeleton";

type EmbeddedLootRowsSkeletonProps = {
  rows: number;
};

export const EmbeddedLootRowsSkeleton = ({
  rows,
}: EmbeddedLootRowsSkeletonProps) => (
  <div aria-busy="true" className="divide-y divide-border/70">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="p-3">
        <Skeleton className="h-24 rounded-lg" />
      </div>
    ))}
  </div>
);
