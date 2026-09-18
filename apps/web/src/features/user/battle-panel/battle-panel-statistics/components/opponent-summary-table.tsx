import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { Table } from "@lootlog/ui/components/table";
import type { Table as TanStackTable } from "@tanstack/react-table";
import type { KeyboardEvent } from "react";

type OpponentSummaryTableProps<Record extends { opponentId: string }> = {
  onOpponentOpen: (opponentId: string) => void;
  table: TanStackTable<typeof coreTableFeatures, Record>;
};

export const OpponentSummaryTable = <Record extends { opponentId: string }>({
  onOpponentOpen,
  table,
}: OpponentSummaryTableProps<Record>) => {
  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    opponentId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onOpponentOpen(opponentId);
  };

  return (
    <ScrollArea className="-mx-3 -mb-3 min-w-0">
      <Table>
        <TanStackTableHeader
          table={table}
          className="bg-background/80"
          rowClassName="border-b-1! border-border"
          headClassName="whitespace-nowrap"
        />
        <TanStackTableBody
          table={table}
          cellClassName="whitespace-nowrap"
          getRowProps={(row) => ({
            onClick: () => onOpponentOpen(row.original.opponentId),
            onKeyDown: (event) =>
              handleRowKeyDown(event, row.original.opponentId),
            role: "link",
            tabIndex: 0,
            className:
              "h-14 cursor-pointer border-b border-border transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          })}
        />
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
