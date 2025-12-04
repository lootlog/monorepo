import { ActivityLogs } from "@/features/activity-logs/activity-logs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")({
  component: ActivityLogs,
});
