import { createFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild/notifications/notification-rule-form-page";
import { NotificationCreateSkeleton } from "@/features/guild/notifications/notification-create-skeleton";
import { getRolesControllerGetGuildRolesQueryOptions } from "@/lib/api/generated/main/roles/roles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/create",
)({
  component: NotificationRuleFormPage,
  pendingComponent: NotificationCreateSkeleton,
  loader: ({ context, params }) =>
    withRouteLoaderCancellation(async () => {
      await context.queryClient.ensureQueryData(
        getRolesControllerGetGuildRolesQueryOptions({
          guildId: params.guildId,
        }),
      );

      return null;
    }),
});
