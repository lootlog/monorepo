import { createFileRoute } from "@tanstack/react-router";
import { guildRolesQueryOptions } from "@/hooks/api/guilds/use-guild-roles";
import { RolesSettings } from "@/features/guild-settings/roles-settings/roles-settings";

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
