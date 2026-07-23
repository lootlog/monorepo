import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user/notifications/notifications";
import { UserNotificationsPageSkeleton } from "@/features/user/notifications/notifications-page-skeleton";
import {
  getNotificationsUserControllerGetUserTargetsQueryOptions,
  getNotificationsUserControllerGetWatchedItemsQueryOptions,
} from "@lootlog/api-client/react-query/main/notifications";
import { getGuildsControllerGetUserGuildsQueryOptions } from "@lootlog/api-client/react-query/main/guilds";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
  pendingComponent: UserNotificationsPageSkeleton,
  loader: ({ abortController, context }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void Promise.all([
        prefetchRouteQuery(
          context.queryClient,
          getGuildsControllerGetUserGuildsQueryOptions(),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getNotificationsUserControllerGetUserTargetsQueryOptions(),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getNotificationsUserControllerGetWatchedItemsQueryOptions(),
        ),
      ]).catch(() => undefined);

      return null;
    }),
});
