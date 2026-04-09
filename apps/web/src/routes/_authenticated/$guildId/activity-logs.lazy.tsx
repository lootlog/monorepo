import { createLazyFileRoute } from "@tanstack/react-router";
import { ActivityLogs } from "@/features/activity-logs/activity-logs";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/activity-logs",
)({
  component: ActivityLogs,
});
