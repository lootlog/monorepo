import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogsPageSkeleton } from "@/features/activity-logs/activity-logs-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  pendingComponent: ActivityLogsPageSkeleton,
});
