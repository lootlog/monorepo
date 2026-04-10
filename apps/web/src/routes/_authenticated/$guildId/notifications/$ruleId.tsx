import { createFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild-notifications/notification-rule-form-page";
import { NotificationCreateSkeleton } from "@/features/guild-notifications/notification-create-skeleton";
import { guildRolesQueryOptions } from "@/hooks/api/guilds/use-guild-roles";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/$ruleId",
)({
  component: NotificationRuleFormPage,
  pendingComponent: NotificationCreateSkeleton,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildRolesQueryOptions(params.guildId, {
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
});
