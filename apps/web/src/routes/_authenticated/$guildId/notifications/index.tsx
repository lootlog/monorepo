import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/features/guild-notifications/notifications-settings";

export const Route = createFileRoute("/_authenticated/$guildId/notifications/")(
  {
    component: NotificationsSettings,
  },
);
