import { createFileRoute } from "@tanstack/react-router";
import { NotificationRuleFormPage } from "@/features/guild/notifications/notification-rule-form-page";
import { NotificationCreateSkeleton } from "@/features/guild/notifications/notification-create-skeleton";
import {
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getGuildsControllerGetWorldsByGuildIdQueryOptions,
  getRolesControllerGetGuildRolesQueryOptions,
} from "@lootlog/client/main";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/create",
)({
  component: NotificationRuleFormPage,
  pendingComponent: NotificationCreateSkeleton,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void Promise.all([
        context.queryClient.prefetchQuery(
          getNotificationsGuildControllerGetGuildTargetsQueryOptions({
            guildId: params.guildId,
          }),
        ),
        context.queryClient.prefetchQuery(
          getNotificationsGuildControllerGetGuildRulesQueryOptions({
            guildId: params.guildId,
          }),
        ),
        context.queryClient.prefetchQuery(
          getGuildsControllerGetWorldsByGuildIdQueryOptions({
            guildId: params.guildId,
          }),
        ),
      ]);
      await context.queryClient.ensureQueryData(
        getRolesControllerGetGuildRolesQueryOptions({
          guildId: params.guildId,
        }),
      );

      return null;
    }),
});
