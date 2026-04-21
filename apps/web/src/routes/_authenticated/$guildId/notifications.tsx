import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  guildNotificationJobsQueryOptions,
  guildNotificationRulesQueryOptions,
  guildNotificationTargetsQueryOptions,
} from "@/features/guild/notifications/notifications-api";
import { guildDiscordSyncQueryOptions } from "@/hooks/api/guilds/use-guild-discord-sync";

function GuildNotificationsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/notifications")({
  loader: async ({ context, params, preload }) => {
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
        guildDiscordSyncQueryOptions(params.guildId),
      ),
    ]);

    return null;
  },
  component: GuildNotificationsLayout,
});
