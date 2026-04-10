import { createFileRoute } from "@tanstack/react-router";
import { UserNotificationsPageSkeleton } from "@/features/user-notifications/user-notifications-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  pendingComponent: UserNotificationsPageSkeleton,
});
