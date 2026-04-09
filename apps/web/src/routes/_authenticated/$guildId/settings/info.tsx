import { createFileRoute } from "@tanstack/react-router";
import { guildDiscordSyncQueryOptions } from "@/hooks/api/guilds/use-guild-discord-sync";
import { InfoSettings } from "@/features/guild-settings/info-settings/info-settings";

export const Route = createFileRoute("/_authenticated/$guildId/settings/info")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildDiscordSyncQueryOptions(params.guildId),
    );
  },
  component: InfoSettings,
});
