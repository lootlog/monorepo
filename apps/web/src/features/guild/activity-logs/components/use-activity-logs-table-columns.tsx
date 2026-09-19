import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { upperFirst } from "es-toolkit";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import type { PaginatedActivitiesResponseDtoDataItem as Activity } from "@lootlog/client/activity";
import { Badge } from "@lootlog/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Gamepad2, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityLogActor } from "./activity-log-actor";
import { ActivityLogDetailsPopover } from "./activity-log-details-popover";
import { ActivityLogEvent } from "./activity-log-event";

const ACTIVITY_LOG_SOURCE_ICONS = {
  GAME: Gamepad2,
  WEB_APP: Monitor,
} as const;

export const ACTIVITY_LOGS_DETAILS_COLUMN_ID = "details";

type UseActivityLogsTableColumnsOptions = {
  memberNameByDiscordId: Map<string, string>;
};

export const useActivityLogsTableColumns = ({
  memberNameByDiscordId,
}: UseActivityLogsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  Activity
>[] => {
  const { t } = useTranslation();

  return [
    {
      id: "event",
      header: () => t("activityLogs.table.columns.event"),
      cell: ({ row }) => <ActivityLogEvent type={row.original.type} />,
    },
    {
      id: "player",
      header: () => t("activityLogs.table.columns.player"),
      cell: ({ row }) => <ActivityLogActor activity={row.original} />,
    },
    {
      id: "member",
      header: () => t("activityLogs.table.columns.member"),
      cell: ({ row: { original: activity } }) => (
        <span className="block truncate text-sm">
          {memberNameByDiscordId.get(activity.discordId) ?? activity.discordId}
        </span>
      ),
    },
    {
      id: "source",
      header: () => t("activityLogs.table.columns.source"),
      cell: ({ row: { original: activity } }) => {
        const SourceIcon = ACTIVITY_LOG_SOURCE_ICONS[activity.source];

        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <SourceIcon className="size-3" aria-hidden="true" />
            {t(`activityLogs.list.sources.${activity.source}`)}
          </Badge>
        );
      },
    },
    {
      id: "world",
      header: () => t("activityLogs.table.columns.world"),
      cell: ({ row: { original: activity } }) => (
        <span className="text-sm text-muted-foreground">
          {activity.world ? upperFirst(activity.world) : "—"}
        </span>
      ),
    },
    {
      id: "time",
      header: () => t("activityLogs.table.columns.time"),
      cell: ({ row: { original: activity } }) => (
        <div className="flex min-w-[104px] flex-col gap-0.5 leading-tight">
          <span className="truncate text-xs font-medium">
            {getRelativeTime(activity.createdAt)}
          </span>
          <time
            dateTime={activity.createdAt}
            className="truncate text-[11px] tabular-nums text-muted-foreground"
          >
            {format(new Date(activity.createdAt), "dd.MM.yyyy HH:mm:ss")}
          </time>
        </div>
      ),
    },
    {
      id: ACTIVITY_LOGS_DETAILS_COLUMN_ID,
      header: () => (
        <span className="sr-only">{t("activityLogs.list.additionalData")}</span>
      ),
      cell: ({ row }) => <ActivityLogDetailsPopover activity={row.original} />,
    },
  ];
};
