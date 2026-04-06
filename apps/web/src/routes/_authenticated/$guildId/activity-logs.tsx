import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/activity-logs/activity-logs";

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  component: ActivityLogs,
});
