import { TableBody, TableRow } from "@lootlog/ui/components/table";
import { flexRender, type Table } from "@tanstack/react-table";
import { cn } from "cn";
import { Fragment } from "react";
import { ROW_ENTRANCE_CLASS_NAME } from "@/components/ui/row-entrance";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { OneVsOneStatsRow } from "./one-vs-one-stats-rows";

type OneVsOneStatsTableBodyProps = {
  table: Table<typeof coreTableFeatures, OneVsOneStatsRow>;
  /** Search key of the row the stat search currently points at. */
  activeSearchKey: string | null;
};

// The shared body wraps every cell in its own `<td>`; here the column cells render theirs,
// because a category row and a stat row style the same column differently.
export const OneVsOneStatsTableBody = ({
  table,
  activeSearchKey,
}: OneVsOneStatsTableBodyProps) => {
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          className={cn(
            ROW_ENTRANCE_CLASS_NAME,
            "border-b border-border/70",
            row.original.kind === "category" && "bg-muted/50",
            activeSearchKey === row.original.searchKey &&
              "outline outline-1 -outline-offset-1 outline-primary/60",
          )}
          data-battle-stat-search-key={row.original.searchKey}
        >
          {row.getVisibleCells().map((cell) => (
            <Fragment key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Fragment>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
};
