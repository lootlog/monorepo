import { Skeleton } from "@lootlog/ui/components/skeleton";

type TableRowsSkeletonProps = {
  rows?: number;
  trailingColumns?: number;
};

export const TableRowsSkeleton = ({
  rows = 10,
  trailingColumns = 4,
}: TableRowsSkeletonProps) => {
  return (
    <div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex h-14 items-center gap-4 border-b border-border px-4"
        >
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          {Array.from({ length: trailingColumns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 w-12" />
          ))}
        </div>
      ))}
    </div>
  );
};
