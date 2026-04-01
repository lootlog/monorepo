import { createFileRoute } from "@tanstack/react-router";
import {
  guildNotificationsQueryOptions,
  guildNotificationJobsQueryOptions,
} from "@/hooks/api/guilds/use-guild-notifications";
import { guildDiscordSyncQueryOptions } from "@/hooks/api/guilds/use-guild-discord-sync";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/notifications",
)({
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
  },
});
