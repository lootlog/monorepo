import { createFileRoute } from "@tanstack/react-router";
import { NotificationCreateSkeleton } from "@/features/guild-notifications/notification-create-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/$ruleId",
)({
  pendingComponent: NotificationCreateSkeleton,
});
