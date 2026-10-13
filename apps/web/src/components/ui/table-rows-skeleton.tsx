import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

type TableRowsSkeletonProps = {
  rows?: number;
  trailingColumns?: number;
  /** Stands in for a table header that is not rendered while loading. */
  withHeader?: boolean;
  /**
   * What the loaded rows hold. `media` rows carry 40px content, such as an
   * `NpcTile`, avatar, or row link, in padded `h-14` cells, so their collapsed
   * border adds a pixel to a 57px row. `text` rows stay 56px, border included.
   */
  rowContent?: "media" | "text";
  /** Rows lead with an `NpcTile` rather than an avatar. */
  withNpcTile?: boolean;
};

export const TableRowsSkeleton = ({
  rows = 10,
  trailingColumns = 4,
  withHeader = false,
  rowContent = "media",
  withNpcTile = false,
}: TableRowsSkeletonProps) => {
  return (
    <div>
      {withHeader && (
        <div className="flex h-10 items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-3 w-24" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex h-14 items-center gap-4 border-b border-border px-4",
            rowContent === "media" && "box-content",
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
};
