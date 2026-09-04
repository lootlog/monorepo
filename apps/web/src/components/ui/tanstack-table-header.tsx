import {
  flexRender,
  type Header,
  type RowData,
  type Table as TanStackTable,
  type TableFeatures,
} from "@tanstack/react-table";
import { TableHead, TableHeader, TableRow } from "@lootlog/ui/components/table";

type TanStackTableHeaderProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> = {
  table: TanStackTable<TFeatures, TData>;
  className?: string;
  rowClassName?: string;
  headClassName?:
    | string
    | ((header: Header<TFeatures, TData, unknown>) => string);
};

export const TanStackTableHeader = <
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  table,
  className,
  rowClassName,
  headClassName,
}: TanStackTableHeaderProps<TFeatures, TData>) => {
  return (
    <TableHeader className={className}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className={rowClassName}>
          {headerGroup.headers.map((header) => {
            const resolvedHeadClassName =
              typeof headClassName === "function"
                ? headClassName(header)
                : headClassName;

            return (
              <TableHead key={header.id} className={resolvedHeadClassName}>
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
