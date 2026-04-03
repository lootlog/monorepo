import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationsHistoryPage } from "@/features/guild-notifications/notifications-history-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  component: NotificationsHistoryPage,
});
