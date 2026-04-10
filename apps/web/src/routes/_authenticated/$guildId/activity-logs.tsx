import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/activity-logs/activity-logs";
import { ActivityLogsPageSkeleton } from "@/features/activity-logs/activity-logs-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  component: ActivityLogs,
  pendingComponent: ActivityLogsPageSkeleton,
});
