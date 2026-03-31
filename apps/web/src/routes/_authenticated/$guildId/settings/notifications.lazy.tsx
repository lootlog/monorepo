import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/features/guild-settings/notifications-settings/notifications-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/notifications",
)({
  component: NotificationsSettings,
});
