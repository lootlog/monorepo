import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { TableHead, TableHeader, TableRow } from "@lootlog/ui/components/table";

type TanStackTableHeaderProps<TData> = {
  table: TanStackTable<TData>;
  className?: string;
  rowClassName?: string;
  headClassName?: string;
};

export const TanStackTableHeader = <TData,>({
  table,
  className,
  rowClassName,
  headClassName,
}: TanStackTableHeaderProps<TData>) => {
  return (
    <TableHeader className={className}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className={rowClassName}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id} className={headClassName}>
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
};
