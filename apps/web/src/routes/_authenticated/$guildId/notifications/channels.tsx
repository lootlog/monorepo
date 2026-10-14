import {
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
  getGuildsControllerGetGuildDiscordSyncStatusQueryOptions,
} from "@lootlog/client/main";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationsChannelsPage } from "@/features/guild/notifications/notifications-channels-page";
import { NotificationsChannelsPageSkeleton } from "@/features/guild/notifications/notifications-channels-page-skeleton";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/channels",
)({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void Promise.all([
        prefetchRouteQuery(
          context.queryClient,
          getNotificationsGuildControllerGetGuildTargetsQueryOptions({
            guildId: params.guildId,
          }),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getNotificationsGuildControllerGetGuildRulesQueryOptions({
            guildId: params.guildId,
          }),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getGuildsControllerGetGuildDiscordSyncStatusQueryOptions({
            guildId: params.guildId,
          }),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: NotificationsChannelsPage,
  pendingComponent: NotificationsChannelsPageSkeleton,
});
