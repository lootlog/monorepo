import { createFileRoute } from "@tanstack/react-router";
import { NotificationsHistoryPage } from "@/features/guild-notifications/notifications-history-page";
import { NotificationHistorySkeleton } from "@/features/guild-notifications/notification-history-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  component: NotificationsHistoryPage,
  pendingComponent: NotificationHistorySkeleton,
});
