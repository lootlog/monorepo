import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user/notifications/notifications";
import { UserNotificationsPageSkeleton } from "@/features/user/notifications/notifications-page-skeleton";
import {
  getNotificationsUserControllerGetUserTargetsQueryOptions,
  getNotificationsUserControllerGetWatchedItemsQueryOptions,
} from "@/lib/api/generated/main/notifications/notifications";
import { getGuildsControllerGetUserGuildsQueryOptions } from "@/lib/api/generated/main/guilds/guilds";
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
