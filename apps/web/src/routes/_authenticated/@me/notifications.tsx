import { createFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user-notifications/user-notifications";
import { UserNotificationsPageSkeleton } from "@/features/user-notifications/user-notifications-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
  pendingComponent: UserNotificationsPageSkeleton,
});
