import {
  flexRender,
  type Cell,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import type { ComponentProps } from "react";
import { TableBody, TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "@lootlog/ui/lib/utils";

type TableRowProps = ComponentProps<typeof TableRow>;

type TanStackTableBodyProps<TData> = {
  table: TanStackTable<TData>;
  rowClassName?: string | ((row: Row<TData>) => string);
  cellClassName?: string | ((cell: Cell<TData, unknown>) => string);
  getRowProps?: (row: Row<TData>) => TableRowProps;
};

export const TanStackTableBody = <TData,>({
  table,
  rowClassName,
  cellClassName,
  getRowProps,
}: TanStackTableBodyProps<TData>) => {
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        const rowProps = getRowProps?.(row);
        const resolvedRowClassName =
          typeof rowClassName === "function" ? rowClassName(row) : rowClassName;

        return (
          <TableRow
            key={row.id}
            {...rowProps}
            className={cn(resolvedRowClassName, rowProps?.className)}
          >
            {row.getVisibleCells().map((cell) => {
              const resolvedCellClassName =
                typeof cellClassName === "function"
                  ? cellClassName(cell)
                  : cellClassName;

              return (
                <TableCell key={cell.id} className={resolvedCellClassName}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
};
