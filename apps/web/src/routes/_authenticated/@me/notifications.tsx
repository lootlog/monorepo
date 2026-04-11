import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user/notifications/notifications";
import { UserNotificationsPageSkeleton } from "@/features/user/notifications/notifications-page-skeleton";
import { guildsQueryOptions } from "@/hooks/api/guilds/use-guilds";
import { userNotificationsQueryOptions } from "@/hooks/api/user/use-user-notifications";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
  pendingComponent: UserNotificationsPageSkeleton,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(guildsQueryOptions()),
      context.queryClient.ensureQueryData(userNotificationsQueryOptions()),
    ]);

    return null;
  },
});
