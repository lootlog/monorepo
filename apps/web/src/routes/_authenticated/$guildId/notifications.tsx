import { NotificationsLayout } from "@/features/guild/notifications/notifications-layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$guildId/notifications")({
  component: NotificationsLayout,
});
