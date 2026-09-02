import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  getNotificationsGuildControllerGetGuildJobsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
} from "@lootlog/client/main";
import { getGuildsControllerGetGuildDiscordSyncStatusQueryOptions } from "@lootlog/client/main";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

function GuildNotificationsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/notifications")({
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
  component: GuildNotificationsLayout,
});
