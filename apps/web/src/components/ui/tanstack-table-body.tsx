import {
  flexRender,
  type Cell,
  type Row,
  type RowData,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import { TableBody, TableCell, TableRow } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { ROW_ENTRANCE_CLASS_NAME } from "@/components/ui/row-entrance";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";

type TableRowProps = ComponentProps<typeof TableRow> & {
  "data-state"?: string;
};

type TanStackTableBodyProps<TData extends RowData> = {
  table: TanStackTable<typeof coreTableFeatures, TData>;
  rowHeaderColumnId?: string;
  rowClassName?: string;
  getRowClassName?: (row: Row<typeof coreTableFeatures, TData>) => string;
  cellClassName?: string;
  getCellClassName?: (
    cell: Cell<typeof coreTableFeatures, TData, unknown>,
  ) => string;
  getRowProps?: (row: Row<typeof coreTableFeatures, TData>) => TableRowProps;
  renderCellContent?: (
    cell: Cell<typeof coreTableFeatures, TData, unknown>,
    content: ReactNode,
  ) => ReactNode;
  /** Rows rendered directly after a data row, such as an expanded detail row. */
  renderRowDetail?: (row: Row<typeof coreTableFeatures, TData>) => ReactNode;
};

export const TanStackTableBody = <TData extends RowData>({
  table,
  rowHeaderColumnId,
  rowClassName,
  getRowClassName,
  cellClassName,
  getCellClassName,
  getRowProps,
  renderCellContent,
  renderRowDetail,
}: TanStackTableBodyProps<TData>) => {
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        const rowProps = getRowProps?.(row);
        const resolvedRowClassName = getRowClassName?.(row) ?? rowClassName;

        const dataRow = (
          <TableRow
            key={row.id}
            {...rowProps}
            className={cn(
              ROW_ENTRANCE_CLASS_NAME,
              resolvedRowClassName,
              rowProps?.className,
            )}
          >
            {row.getVisibleCells().map((cell) => {
              const resolvedCellClassName =
                getCellClassName?.(cell) ?? cellClassName;

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

        if (!renderRowDetail) {
          return dataRow;
        }

        return (
          <Fragment key={row.id}>
            {dataRow}
            {renderRowDetail(row)}
          </Fragment>
        );
      })}
    </TableBody>
  );
};
