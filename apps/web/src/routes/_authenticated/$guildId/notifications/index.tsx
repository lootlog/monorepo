import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPageSkeleton } from "@/features/guild-notifications/notifications-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/notifications/")(
  {
    pendingComponent: NotificationsPageSkeleton,
  },
);
