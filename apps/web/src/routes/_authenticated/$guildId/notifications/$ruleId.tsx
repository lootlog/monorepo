import { createFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild-notifications/notification-rule-form-page";
import { NotificationCreateSkeleton } from "@/features/guild-notifications/notification-create-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/$ruleId",
)({
  component: NotificationRuleFormPage,
  pendingComponent: NotificationCreateSkeleton,
});
