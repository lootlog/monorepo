import { Outlet, createFileRoute } from "@tanstack/react-router";
import { guildDiscordSyncQueryOptions } from "@/hooks/api/guilds/use-guild-discord-sync";
import {
  guildNotificationJobsQueryOptions,
  guildNotificationsQueryOptions,
} from "@/hooks/api/guilds/use-guild-notifications";

function GuildNotificationsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/notifications")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        guildNotificationsQueryOptions(params.guildId),
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
