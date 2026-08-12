import { useState } from "react";
import type { TFunction } from "i18next";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
} from "@tanstack/react-table";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { cn } from "@/utils/cn";
import type { MapTimelineData } from "../../types/api";
import { getMapCoverageColorClassName } from "../../utils/get-map-coverage-color-class-name";
import { getKillMapTimelineDiagnostics } from "../../utils/kill-map-timeline-data";
import { KillMapTimelineTableRow } from "./kill-map-timeline-table-row";
import {
  getKillMapTimelineColumnClassName,
  getKillMapTimelineColumnWidthClassName,
} from "./kill-map-timeline-table-utils";

interface KillMapsTimelineTableProps {
  maps: MapTimelineData[];
  startTime: Date;
  endTime: Date;
  memberRoleColors?: ReadonlyMap<number, string>;
  t: TFunction;
}

const TABLE_BREAKPOINT = 768;

export const KillMapsTimelineTable = ({
  maps,
  startTime,
  endTime,
  memberRoleColors = new Map(),
  t,
}: KillMapsTimelineTableProps) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const isNarrow = useMaxWidth(TABLE_BREAKPOINT);

  const columns: ColumnDef<MapTimelineData>[] = [
    {
      id: "id",
      header: t("events.killDetail.mapCoverage.columns.id"),
      cell: ({ row }) => (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          #{row.original.numericMapId}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "map",
      header: t("events.killDetail.mapCoverage.columns.map"),
      cell: ({ row }) => {
        const map = row.original;
        const diagnostics = getKillMapTimelineDiagnostics(
          map,
          startTime,
          endTime,
        );

        return (
          <div className="min-w-0">
            <span
              id={`map-${map.mapId}-summary`}
              className="block truncate text-sm font-medium"
              title={map.mapName}
            >
              {map.mapName}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground md:hidden">
              <Users className="size-3.5" />
              {t("events.killDetail.mapCoverage.memberCount", {
                count: diagnostics.assignments.length,
              })}
            </span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "participants",
      header: t("events.killDetail.mapCoverage.columns.participants"),
      cell: ({ row }) => {
        const diagnostics = getKillMapTimelineDiagnostics(
          row.original,
          startTime,
          endTime,
        );

        return (
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Users className="size-4" />
            {t("events.killDetail.mapCoverage.memberCount", {
              count: diagnostics.assignments.length,
            })}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      id: "coverage",
      header: () => (
        <span className="block text-right">
          {t("events.killDetail.mapCoverage.columns.coverage")}
        </span>
      ),
      cell: ({ row }) => {
        const diagnostics = getKillMapTimelineDiagnostics(
          row.original,
          startTime,
          endTime,
        );

        if (!diagnostics.isValidWindow) {
          return (
            <span className="block text-right text-muted-foreground">—</span>
          );
        }

        const coveragePercent = diagnostics.coveragePercent;

        return (
          <span
            className={cn(
              "block text-right text-sm font-semibold tabular-nums",
              getMapCoverageColorClassName(coveragePercent),
            )}
          >
            {coveragePercent}%
          </span>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => (
        <span className="sr-only">
          {t("events.killDetail.mapCoverage.columns.actions")}
        </span>
      ),
      cell: () => null,
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: maps,
    columns,
    state: {
      expanded,
      columnVisibility: {
        id: !isNarrow,
        participants: !isNarrow,
      },
    },
    onExpandedChange: setExpanded,
    getRowId: (map) => map.mapId,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <Table
      className="w-full table-fixed"
      aria-label={t("events.killDetail.mapCoverage.tableLabel")}
    >
      <colgroup>
        {table.getVisibleLeafColumns().map((column) => (
          <col
            key={column.id}
            className={getKillMapTimelineColumnWidthClassName(column.id)}
          />
        ))}
      </colgroup>
      <TableHeader className="max-md:sr-only bg-secondary/25">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="border-border/80">
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  "h-9 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                  getKillMapTimelineColumnClassName(header.column.id),
                )}
              >
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
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <KillMapTimelineTableRow
            key={row.id}
            row={row}
            visibleCells={row.getVisibleCells()}
            isExpanded={row.getIsExpanded()}
            visibleColumnCount={row.getVisibleCells().length}
            startTime={startTime}
            endTime={endTime}
            memberRoleColors={memberRoleColors}
            t={t}
          />
        ))}
      </TableBody>
    </Table>
  );
};
