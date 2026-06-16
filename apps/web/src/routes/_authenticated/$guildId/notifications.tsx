import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  getNotificationsGuildControllerGetGuildJobsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
} from "@/lib/api/generated/main/notifications/notifications";
import { getGuildsControllerGetGuildDiscordSyncStatusQueryOptions } from "@/lib/api/generated/main/guilds/guilds";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

function GuildNotificationsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/notifications")({
  loader: ({ abortController, context, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      await Promise.all([
        context.queryClient.ensureQueryData(
          getNotificationsGuildControllerGetGuildTargetsQueryOptions({
            guildId: params.guildId,
          }),
        ),
        context.queryClient.ensureQueryData(
          getNotificationsGuildControllerGetGuildRulesQueryOptions({
            guildId: params.guildId,
          }),
        ),
        context.queryClient.ensureQueryData(
          getNotificationsGuildControllerGetGuildJobsQueryOptions({
            guildId: params.guildId,
          }),
        ),
        context.queryClient.ensureQueryData(
          getGuildsControllerGetGuildDiscordSyncStatusQueryOptions({
            guildId: params.guildId,
          }),
        ),
      ]);

      return null;
    }),
  component: GuildNotificationsLayout,
});
