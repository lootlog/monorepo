import {
  getNotificationsGuildControllerGetGuildJobsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
} from "@lootlog/client/main";
import { getGuildsControllerGetGuildDiscordSyncStatusQueryOptions } from "@lootlog/client/main";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

import { createFileRoute } from "@tanstack/react-router";
import { NotificationsSettings } from "@/features/guild/notifications/notifications-settings";
import { NotificationsPageSkeleton } from "@/features/guild/notifications/notifications-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/notifications/")(
  {
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
            getNotificationsGuildControllerGetGuildJobsQueryOptions({
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
    component: NotificationsSettings,
    pendingComponent: NotificationsPageSkeleton,
  },
);
