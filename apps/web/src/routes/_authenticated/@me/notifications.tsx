import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user/notifications/notifications";
import { UserNotificationsPageSkeleton } from "@/features/user/notifications/notifications-page-skeleton";
import {
  getNotificationsUserControllerGetUserTargetsQueryOptions,
  getNotificationsUserControllerGetWatchedItemsQueryOptions,
} from "@/lib/api/generated/main/notifications/notifications";
import { getGuildsControllerGetUserGuildsQueryOptions } from "@/lib/api/generated/main/guilds/guilds";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
  pendingComponent: UserNotificationsPageSkeleton,
  loader: ({ context, preload }) =>
    withRouteLoaderCancellation(async () => {
      if (preload) {
        return null;
      }

      await Promise.all([
        context.queryClient.ensureQueryData(
          getGuildsControllerGetUserGuildsQueryOptions(),
        ),
        context.queryClient.ensureQueryData(
          getNotificationsUserControllerGetUserTargetsQueryOptions(),
        ),
        context.queryClient.ensureQueryData(
          getNotificationsUserControllerGetWatchedItemsQueryOptions(),
        ),
      ]);

      return null;
    }),
});
