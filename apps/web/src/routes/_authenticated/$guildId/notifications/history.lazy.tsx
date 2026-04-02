import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationsHistoryPage } from "@/features/guild-settings/notifications-settings/notifications-history-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  component: NotificationsHistoryPage,
});
