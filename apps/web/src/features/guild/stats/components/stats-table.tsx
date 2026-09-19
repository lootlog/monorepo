import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { Table } from "@lootlog/ui/components/table";
import type { RowData, Table as TanStackTable } from "@tanstack/react-table";

/** Column ids the stats tables share, so every ranking aligns the same way. */
export const STATS_TABLE_POSITION_COLUMN_ID = "position";

export const STATS_TABLE_TYPE_COLUMN_ID = "type";

/** Prefix of every numeric column: `count`, or `count:<npc type>`. */
export const STATS_TABLE_COUNT_COLUMN_ID = "count";

const getHeadClassName = (columnId: string) => {
  if (columnId === STATS_TABLE_POSITION_COLUMN_ID) {
    return "w-14 text-center";
  }

  if (columnId.startsWith(STATS_TABLE_COUNT_COLUMN_ID)) {
    return "text-right";
  }

  return "";
};

const getCellClassName = (columnId: string) => {
  if (columnId === STATS_TABLE_POSITION_COLUMN_ID) {
    return "text-center";
  }

  if (columnId === STATS_TABLE_TYPE_COLUMN_ID) {
    return "text-sm text-muted-foreground";
  }

  return "";
};

type StatsTableProps<TData extends RowData> = {
  table: TanStackTable<typeof coreTableFeatures, TData>;
  className?: string;
  /** Makes the whole row a click target, next to the link in its name cell. */
  onRowClick?: (row: TData) => void;
};

/** Same header treatment as the battle panel lists: pinned, on the page background. */
export const StatsTable = <TData extends RowData>({
  table,
  className,
  onRowClick,
}: StatsTableProps<TData>) => (
  <Table className={className}>
    <TanStackTableHeader
      table={table}
      className="sticky top-0 z-10 bg-background"
      rowClassName="border-b-1! border-border hover:bg-transparent"
      getHeadClassName={(header) => getHeadClassName(header.column.id)}
    />
    <TanStackTableBody
      table={table}
      rowClassName="h-14 border-b border-border hover:bg-muted/50"
      getCellClassName={(cell) => getCellClassName(cell.column.id)}
      getRowProps={
        onRowClick
          ? (row) => ({
              className: "cursor-pointer",
              onClick: () => onRowClick(row.original),
            })
          : undefined
      }
    />
  </Table>
);
