import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";

type TableRowsSkeletonProps = {
  rows?: number;
  trailingColumns?: number;
  /** Stands in for a table header that is not rendered while loading. */
  withHeader?: boolean;
  /** Rows lead with an `NpcTile`, whose 40px box sets the row height. */
  withNpcTile?: boolean;
  /** Replaces the rows below `md`, where the results render a card list instead of the table. */
  mobileList?: ReactNode;
};

export const TableRowsSkeleton = ({
  rows = 10,
  trailingColumns = 4,
  withHeader = false,
  withNpcTile = false,
  mobileList,
}: TableRowsSkeletonProps) => {
  const tableRows = (
    <div className={cn(mobileList && "hidden md:block")}>
      {withHeader && (
        <div className="flex h-10 items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-3 w-24" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex items-center gap-4 border-b border-border px-4",
            withNpcTile ? "py-2" : "h-14",
          )}
        >
          <Skeleton className="h-4 w-8" />
          {withNpcTile ? (
            <Skeleton className="h-10 w-8 rounded-lg" />
          ) : (
            <Skeleton className="h-8 w-8 rounded-full" />
          )}
          <Skeleton className="h-4 flex-1" />
          {Array.from({ length: trailingColumns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 w-12" />
          ))}
        </div>
      ))}
    </div>
  );

  if (!mobileList) {
    return tableRows;
  }

  return (
    <>
      <div className="md:hidden">{mobileList}</div>
      {tableRows}
    </>
  );
};
