import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { VirtualTableSpacerRow } from "@/components/ui/virtual-table-spacer-row";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import type { PaginatedActivitiesResponseDtoDataItem as Activity } from "@lootlog/client/activity";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import { flexRender, useTable } from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";
import { cn } from "cn";
import type { CSSProperties } from "react";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useTranslation } from "react-i18next";
import { ActivityLogDetailsPopover } from "./activity-log-details-popover";
import { ActivityLogEvent } from "./activity-log-event";
import {
  ACTIVITY_LOGS_DETAILS_COLUMN_ID,
  useActivityLogsTableColumns,
} from "./use-activity-logs-table-columns";

type ActivityLogsTableProps = {
  activities: Activity[];
  /** Wide pages show a table; narrower ones list each entry on two lines. */
  usesTable: boolean;
  /** Where the table header pins: under the page's sticky filter bar. */
  headerTop: number;
  memberNameByDiscordId: Map<string, string>;
  virtualRows: VirtualItem[];
  /** Spacer heights standing in for the rows outside the rendered range. */
  padding: { top: number; bottom: number };
};

type HeaderTopStyle = CSSProperties & { "--activity-logs-header-top": string };

// The list is not a table, so it builds no row model.
const NO_TABLE_ROWS: Activity[] = [];

export const ActivityLogsTable = ({
  activities,
  usesTable,
  headerTop,
  memberNameByDiscordId,
  virtualRows,
  padding,
}: ActivityLogsTableProps) => {
  const { t } = useTranslation();
  const columns = useActivityLogsTableColumns({ memberNameByDiscordId });

  const table = useTable({
    features: coreTableFeatures,
    data: usesTable ? activities : NO_TABLE_ROWS,
    columns,
    getRowId: (activity) => activity.id,
  });

  const rows = table.getRowModel().rows;

  const headerTopStyle: HeaderTopStyle = {
    "--activity-logs-header-top": `${headerTop}px`,
  };

  const { top: topPadding, bottom: bottomPadding } = padding;

  if (!usesTable) {
    return (
      <ul>
        {topPadding > 0 && (
          <li aria-hidden="true" style={{ height: topPadding }} />
        )}
        {virtualRows.map((virtualRow) => {
          const activity = activities[virtualRow.index];

          if (!activity) return null;

          return (
            <li
              key={virtualRow.key}
              data-list-tile
              className={cn(
                "flex h-[88px] flex-col justify-center gap-2",
                LIST_TILE_RULE_CLASS,
                LIST_TILE_INSET_CLASS,
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <ActivityLogEvent type={activity.type} />
                </div>
                <time
                  dateTime={activity.createdAt}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {getRelativeTime(activity.createdAt)}
                </time>
                <ActivityLogDetailsPopover activity={activity} />
              </div>
              <div className="flex min-w-0 items-center gap-2 pl-11 text-xs text-muted-foreground">
                {activity.actorSnapshot && (
                  <>
                    <span className="truncate font-medium text-foreground">
                      {activity.actorSnapshot.name}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                {/* The member stays visible next to the character: an audit entry must name who acted. */}
                <span
                  className={cn(
                    "truncate",
                    !activity.actorSnapshot && "font-medium text-foreground",
                  )}
                >
                  {memberNameByDiscordId.get(activity.discordId) ??
                    activity.discordId}
                </span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">
                  {t(`activityLogs.list.sources.${activity.source}`)}
                </span>
              </div>
            </li>
          );
        })}
        {bottomPadding > 0 && (
          <li aria-hidden="true" style={{ height: bottomPadding }} />
        )}
      </ul>
    );
  }

  return (
    <Table
      className="min-w-[960px] table-fixed border-b"
      style={headerTopStyle}
    >
      {/* Virtualized rows come and go, so content must not size the columns. */}
      <colgroup>
        <col className="w-[170px]" />
        <col />
        <col className="w-[180px]" />
        <col className="w-[120px]" />
        <col className="w-[120px]" />
        <col className="w-[150px]" />
        <col className="w-14" />
      </colgroup>
      <TanStackTableHeader
        table={table}
        className="sticky top-(--activity-logs-header-top) z-10 bg-background"
        rowClassName="border-b-1! border-border hover:bg-transparent"
      />
      <TableBody>
        <VirtualTableSpacerRow colSpan={columns.length} height={topPadding} />
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];

          if (!row) return null;

          return (
            <TableRow
              key={virtualRow.key}
              className="h-14 border-b border-border hover:bg-muted/40"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={
                    cell.column.id === ACTIVITY_LOGS_DETAILS_COLUMN_ID
                      ? "text-right"
                      : ""
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        <VirtualTableSpacerRow
          colSpan={columns.length}
          height={bottomPadding}
        />
      </TableBody>
    </Table>
  );
};
