import { createFileRoute } from "@tanstack/react-router";
import { guildDiscordSyncQueryOptions } from "@/hooks/api/guilds/use-guild-discord-sync";

export const Route = createFileRoute("/_authenticated/$guildId/settings/info")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildDiscordSyncQueryOptions(params.guildId),
    );
  },
});
