import { createFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";
import { guildQueryOptions } from "@/hooks/api/guilds/use-guild";

export const Route = createFileRoute("/_authenticated/$guildId")({
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildQueryOptions(params.guildId),
    );
  },
  component: GuildLayout,
});
