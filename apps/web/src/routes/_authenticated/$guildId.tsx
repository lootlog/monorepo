import { createFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";
// import { guildQueryOptions } from "@/hooks/api/guilds/use-guild";
// import { guildPermissionsQueryOptions } from "@/hooks/api/guilds/use-guild-permissions";

export const Route = createFileRoute("/_authenticated/$guildId")({
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  // loader: async ({ context, params }) => {
  //   await Promise.all([
  //     // context.queryClient.ensureQueryData(guildQueryOptions(params.guildId)),
  //     context.queryClient.ensureQueryData(
  //       guildPermissionsQueryOptions(params.guildId),
  //     ),
  //   ]);
  // },
  component: GuildLayout,
});
