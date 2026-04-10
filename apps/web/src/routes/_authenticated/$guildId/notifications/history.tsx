import { createFileRoute } from "@tanstack/react-router";
import { NotificationHistorySkeleton } from "@/features/guild-notifications/notification-history-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  pendingComponent: NotificationHistorySkeleton,
});
