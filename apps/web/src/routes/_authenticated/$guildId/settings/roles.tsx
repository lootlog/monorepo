import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild-settings/roles-settings/roles-settings";
import { guildRolesQueryOptions } from "@/hooks/api/guilds/use-guild-roles";

export const Route = createFileRoute("/_authenticated/$guildId/settings/roles")(
  {
    loader: async ({ context, params }) => {
      await context.queryClient.ensureQueryData(
        guildRolesQueryOptions(params.guildId),
      );
    },
    component: RolesSettings,
  },
);
