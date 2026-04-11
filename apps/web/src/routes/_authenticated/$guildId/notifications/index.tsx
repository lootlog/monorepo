import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/features/guild/notifications/notifications-settings";
import { NotificationsPageSkeleton } from "@/features/guild/notifications/notifications-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/notifications/")(
  {
    component: NotificationsSettings,
    pendingComponent: NotificationsPageSkeleton,
  },
);
