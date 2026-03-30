import { createLazyFileRoute } from "@tanstack/react-router";
import { UserNotificationSettings } from "@/features/user-notification-settings/user-notification-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/settings/notifications",
)({
  component: UserNotificationSettings,
});
