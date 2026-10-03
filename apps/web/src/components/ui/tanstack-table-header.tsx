import {
  flexRender,
  type Header,
  type RowData,
  type Table as TanStackTable,
  type TableFeatures,
} from "@tanstack/react-table";
import { TableHead, TableHeader, TableRow } from "@lootlog/ui/components/table";
import { getColumnAriaSort } from "./get-column-aria-sort";

type TanStackTableHeaderProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> = {
  table: TanStackTable<TFeatures, TData>;
  className?: string;
  rowClassName?: string;
  headClassName?: string;
  getHeadClassName?: (header: Header<TFeatures, TData, unknown>) => string;
};

export const TanStackTableHeader = <
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  table,
  className,
  rowClassName,
  headClassName,
  getHeadClassName,
}: TanStackTableHeaderProps<TFeatures, TData>) => {
  return (
    <TableHeader className={className}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className={rowClassName}>
          {headerGroup.headers.map((header) => {
            const resolvedHeadClassName =
              getHeadClassName?.(header) ?? headClassName;

            return (
              <TableHead
                key={header.id}
                aria-sort={
                  "getIsSorted" in header.column
                    ? getColumnAriaSort(header.column)
                    : undefined
                }
                className={resolvedHeadClassName}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
};
