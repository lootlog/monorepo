import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationSettings } from "@/features/guild-settings/notification-settings/notification-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/notifications",
)({
  component: NotificationSettings,
});
