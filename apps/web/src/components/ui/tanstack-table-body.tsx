import {
  flexRender,
  type Cell,
  type Row,
  type RowData,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import type { ComponentProps, ReactNode } from "react";
import { TableBody, TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { coreTableFeatures } from "@/lib/tanstack-table-features";

type TableRowProps = ComponentProps<typeof TableRow>;

type TanStackTableBodyProps<TData extends RowData> = {
  table: TanStackTable<typeof coreTableFeatures, TData>;
  rowHeaderColumnId?: string;
  rowClassName?:
    | string
    | ((row: Row<typeof coreTableFeatures, TData>) => string);
  cellClassName?:
    | string
    | ((cell: Cell<typeof coreTableFeatures, TData, unknown>) => string);
  getRowProps?: (row: Row<typeof coreTableFeatures, TData>) => TableRowProps;
  renderCellContent?: (
    cell: Cell<typeof coreTableFeatures, TData, unknown>,
    content: ReactNode,
  ) => ReactNode;
};

export const TanStackTableBody = <TData extends RowData>({
  table,
  rowHeaderColumnId,
  rowClassName,
  cellClassName,
  getRowProps,
  renderCellContent,
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
              const content = flexRender(
                cell.column.columnDef.cell,
                cell.getContext(),
              );

              const isRowHeader = cell.column.id === rowHeaderColumnId;

              return (
                <TableCell
                  key={cell.id}
                  as={isRowHeader ? "th" : "td"}
                  scope={isRowHeader ? "row" : undefined}
                  className={cn(
                    isRowHeader && "text-left font-normal",
                    resolvedCellClassName,
                  )}
                >
                  {renderCellContent
                    ? renderCellContent(cell, content)
                    : content}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
};
