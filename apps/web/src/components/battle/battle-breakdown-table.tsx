import { Table } from "@lootlog/ui/components/table";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";

export type BattleBreakdownRow = {
  type: string;
  value: number | string;
  color: string;
};

type BattleBreakdownTableProps = {
  rows: BattleBreakdownRow[];
  typeLabel: string;
  valueLabel: string;
};

const VALUE_COLUMN_ID = "value";

export const BattleBreakdownTable = ({
  rows,
  typeLabel,
  valueLabel,
}: BattleBreakdownTableProps) => {
  const columns: ColumnDef<typeof coreTableFeatures, BattleBreakdownRow>[] = [
    {
      accessorKey: "type",
      header: () => typeLabel,
      cell: ({ row }) => row.original.type,
    },
    {
      id: VALUE_COLUMN_ID,
      accessorKey: "value",
      header: () => valueLabel,
      cell: ({ row }) => row.original.value,
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: rows,
    columns,
    getRowId: (row) => row.type,
  });

  return (
    <Table className="text-sm">
      <TanStackTableHeader
        table={table}
        rowClassName="hover:bg-transparent"
        getHeadClassName={(header) =>
          cn(
            "h-8 text-xs",
            header.column.id === VALUE_COLUMN_ID && "text-right",
          )
        }
      />
      <TanStackTableBody
        table={table}
        rowClassName="h-8 hover:bg-transparent"
        getCellClassName={(cell) =>
          cell.column.id === VALUE_COLUMN_ID
            ? "py-1 text-right font-medium tabular-nums"
            : cn("py-1", cell.row.original.color)
        }
      />
    </Table>
  );
};
