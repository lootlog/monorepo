import { createFileRoute } from "@tanstack/react-router";
import { guildAvailableNotificationTargetsQueryOptions } from "@/hooks/api/guilds/use-guild-notifications";
import { NotificationRuleFormPage } from "@/features/guild-notifications/notification-rule-form-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/create",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildAvailableNotificationTargetsQueryOptions(params.guildId),
    );
  },
  component: NotificationRuleFormPage,
});
