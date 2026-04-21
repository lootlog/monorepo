import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user/notifications/notifications";
import { UserNotificationsPageSkeleton } from "@/features/user/notifications/notifications-page-skeleton";
import {
  userNotificationTargetsQueryOptions,
  userWatchedItemsQueryOptions,
} from "@/features/user/notifications/user-notifications-api";
import { guildsQueryOptions } from "@/hooks/api/guilds/use-guilds";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
  pendingComponent: UserNotificationsPageSkeleton,
  loader: async ({ context, preload }) => {
    if (preload) {
      return null;
    }

    await Promise.all([
      context.queryClient.ensureQueryData(guildsQueryOptions()),
      context.queryClient.ensureQueryData(
        userNotificationTargetsQueryOptions(),
      ),
      context.queryClient.ensureQueryData(userWatchedItemsQueryOptions()),
    ]);

    return null;
  },
});
