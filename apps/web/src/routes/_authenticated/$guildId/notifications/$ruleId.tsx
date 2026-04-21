import { createFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild/notifications/notification-rule-form-page";
import { NotificationCreateSkeleton } from "@/features/guild/notifications/notification-create-skeleton";
import { getRolesControllerGetGuildRolesQueryOptions } from "@/lib/api/generated/main/roles/roles";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/$ruleId",
)({
  component: NotificationRuleFormPage,
  pendingComponent: NotificationCreateSkeleton,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getRolesControllerGetGuildRolesQueryOptions({ guildId: params.guildId }),
    );

    return null;
  },
});
