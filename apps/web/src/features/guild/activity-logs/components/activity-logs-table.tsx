import { ROW_ENTRANCE_CLASS_NAME } from "@/components/ui/row-entrance";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
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
import { useTranslation } from "react-i18next";
import { ActivityLogDetailsPopover } from "./activity-log-details-popover";
import { ActivityLogEvent } from "./activity-log-event";
import {
  ACTIVITY_LOGS_DETAILS_COLUMN_ID,
  useActivityLogsTableColumns,
} from "./use-activity-logs-table-columns";

type ActivityLogsTableProps = {
  activities: Activity[];
  isMobile: boolean;
  memberNameByDiscordId: Map<string, string>;
  virtualRows: VirtualItem[];
  /** Spacer heights standing in for the rows outside the rendered range. */
  padding: { top: number; bottom: number };
};

// The mobile list is not a table, so it builds no row model.
const NO_TABLE_ROWS: Activity[] = [];

export const ActivityLogsTable = ({
  activities,
  isMobile,
  memberNameByDiscordId,
  virtualRows,
  padding,
}: ActivityLogsTableProps) => {
  const { t } = useTranslation();
  const columns = useActivityLogsTableColumns({ memberNameByDiscordId });

  const table = useTable({
    features: coreTableFeatures,
    data: isMobile ? NO_TABLE_ROWS : activities,
    columns,
    getRowId: (activity) => activity.id,
  });

  const rows = table.getRowModel().rows;
  const { top: topPadding, bottom: bottomPadding } = padding;

  if (isMobile) {
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
              className="flex h-[88px] flex-col justify-center gap-2 border-b border-border px-3"
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
    <Table className="min-w-[960px] table-fixed border-b">
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
        className="sticky top-0 z-10 bg-background"
        rowClassName="border-b-1! border-border hover:bg-transparent"
      />
      <TableBody>
        {topPadding > 0 && (
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              style={{ height: topPadding }}
            />
          </TableRow>
        )}
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];

          if (!row) return null;

          return (
            <TableRow
              key={virtualRow.key}
              className={cn(
                ROW_ENTRANCE_CLASS_NAME,
                "h-14 border-b border-border hover:bg-muted/50",
              )}
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
        {bottomPadding > 0 && (
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              style={{ height: bottomPadding }}
            />
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
