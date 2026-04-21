import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  guildNotificationJobsQueryOptions,
  guildNotificationRulesQueryOptions,
  guildNotificationTargetsQueryOptions,
} from "@/features/guild/notifications/notifications-api";
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
  loader: ({ context, params, preload }) =>
    withRouteLoaderCancellation(async () => {
      if (preload) {
        return null;
      }

      await Promise.all([
        context.queryClient.ensureQueryData(
          guildNotificationTargetsQueryOptions(params.guildId),
        ),
        context.queryClient.ensureQueryData(
          guildNotificationRulesQueryOptions(params.guildId),
        ),
        context.queryClient.ensureQueryData(
          guildNotificationJobsQueryOptions(params.guildId),
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
