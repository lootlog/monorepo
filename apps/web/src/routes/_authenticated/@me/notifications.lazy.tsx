import { createLazyFileRoute } from "@tanstack/react-router";
import { UserNotifications } from "@/features/user-notifications/user-notifications";

export const Route = createLazyFileRoute("/_authenticated/@me/notifications")({
  component: UserNotifications,
});
