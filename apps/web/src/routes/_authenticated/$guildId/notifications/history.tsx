import { getNotificationsGuildControllerGetGuildJobsQueryOptions } from "@lootlog/client/main";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsHistoryPage } from "@/features/guild/notifications/notifications-history-page";
import { NotificationHistorySkeleton } from "@/features/guild/notifications/notification-history-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  loader: ({ context, params }) => {
    void prefetchRouteQuery(
      context.queryClient,
      getNotificationsGuildControllerGetGuildJobsQueryOptions({
        guildId: params.guildId,
      }),
    );
  },
  component: NotificationsHistoryPage,
  pendingComponent: NotificationHistorySkeleton,
});
