import { loadNotificationHistory } from "@/features/guild/notifications/load-notification-history";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsHistoryPage } from "@/features/guild/notifications/notifications-history-page";
import { NotificationHistorySkeleton } from "@/features/guild/notifications/notification-history-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  staticData: {
    navigation: ({ t }) => ({
      label: t("common.breadcrumbs.notificationHistory"),
      tab: true,
    }),
  },
  loader: loadNotificationHistory,
  component: NotificationsHistoryPage,
  pendingComponent: NotificationHistorySkeleton,
});
