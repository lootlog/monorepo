import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild-notifications/notification-rule-form-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications/create",
)({
  component: NotificationRuleFormPage,
});
