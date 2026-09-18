import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TableBody, TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import type { ReactNode } from "react";
import { getBattleTableColumnClassName } from "./battle-table-column-class-name";

type BattlesTableSkeletonBodyProps = {
  columnIds: string[];
  rows: number;
};

const teamSkeleton = (
  <div className="flex min-w-0 items-center gap-2">
    <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
    <div className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-2.5 w-10" />
    </div>
  </div>
);

const CELL_SKELETONS = new Map<string, ReactNode>([
  ["select", <Skeleton key="select" className="mx-auto size-5 rounded-md" />],
  ["status", <Skeleton key="status" className="mx-auto size-6 rounded-md" />],
  ["leftTeam", teamSkeleton],
  ["rightTeam", teamSkeleton],
  [
    "battleInfo",
    <div key="battleInfo" className="flex items-center gap-1">
      <Skeleton className="h-[17px] w-11 rounded-md" />
      <Skeleton className="h-[17px] w-16 rounded-md" />
    </div>,
  ],
  ["createdAt", <Skeleton key="createdAt" className="h-3 w-20" />],
  ["actions", <Skeleton key="actions" className="ml-auto size-8 rounded-md" />],
]);

export const BattlesTableSkeletonBody = ({
  columnIds,
  rows,
}: BattlesTableSkeletonBodyProps) => {
  return (
    <TableBody aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow
          key={rowIndex}
          className="h-14 border-b border-border hover:bg-transparent"
        >
          {columnIds.map((columnId) => (
            <TableCell
              key={columnId}
              className={cn(
                "align-middle",
                getBattleTableColumnClassName(columnId),
              )}
            >
              {CELL_SKELETONS.get(columnId)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
};
