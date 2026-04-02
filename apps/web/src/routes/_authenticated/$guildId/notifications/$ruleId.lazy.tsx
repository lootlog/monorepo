import { createLazyFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild-settings/notifications-settings/notification-rule-form-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/notifications/$ruleId",
)({
  component: NotificationRuleFormPage,
});
