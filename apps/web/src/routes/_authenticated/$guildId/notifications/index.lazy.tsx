import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/features/guild-notifications/notifications-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications/",
)({
  component: NotificationsSettings,
});
