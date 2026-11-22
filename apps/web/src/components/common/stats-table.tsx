import { FILTERED_TABLE_HEADER_CLASS } from "@/components/common/page-sticky-table-header";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { Table } from "@lootlog/ui/components/table";
import type { RowData, Table as TanStackTable } from "@tanstack/react-table";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { cn } from "cn";

export const STATS_TABLE_POSITION_COLUMN_ID = "position";

export const STATS_TABLE_TYPE_COLUMN_ID = "type";

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
  onRowClick?: (row: TData) => void;
  isViewerRow?: (row: TData) => boolean;
};

export const StatsTable = <TData extends RowData>({
  table,
  className,
  onRowClick,
  isViewerRow,
}: StatsTableProps<TData>) => (
  <Table className={className}>
    <TanStackTableHeader
      table={table}
      className={FILTERED_TABLE_HEADER_CLASS}
      rowClassName="border-b-1! border-border hover:bg-transparent"
      getHeadClassName={(header) => getHeadClassName(header.column.id)}
    />
    <TanStackTableBody
      table={table}
      getRowClassName={(row) =>
        cn(
          "h-14 border-b border-border hover:bg-muted/40",
          onRowClick && "cursor-pointer",
          isViewerRow?.(row.original) && VIEWER_ROW_CLASS,
        )
      }
      getCellClassName={(cell) => getCellClassName(cell.column.id)}
      getRowProps={(row) => ({
        "aria-current": isViewerRow?.(row.original) || undefined,
        onClick: onRowClick ? () => onRowClick(row.original) : undefined,
      })}
    />
  </Table>
);
