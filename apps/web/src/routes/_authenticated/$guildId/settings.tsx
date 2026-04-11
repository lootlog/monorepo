import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { guildPermissionsQueryOptions } from "@/hooks/api/guilds/use-guild-permissions";
import { canManageGuild } from "@/lib/guild-permissions";
import { throwForbiddenRouteError } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  loader: async ({ context, params, preload }) => {
    if (preload) {
      return null;
    }

    const permissions = await context.queryClient.ensureQueryData(
      guildPermissionsQueryOptions(params.guildId),
    );

    if (!canManageGuild(permissions)) {
      throwForbiddenRouteError();
    }

    return null;
  },
  component: SettingsLayout,
});
