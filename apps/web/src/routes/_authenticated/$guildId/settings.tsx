import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@/lib/api/generated/main/guilds/guilds";
import { canManageGuild } from "@/lib/guild-permissions";
import {
  throwForbiddenRouteError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  loader: ({ abortController, context, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const permissions = await context.queryClient.ensureQueryData(
        getGuildsControllerGetGuildPermissionsQueryOptions(
          { guildId: params.guildId },
          {
            query: {
              queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
                guildId: params.guildId,
              }),
              staleTime: 30_000,
            },
          },
        ),
      );

      if (!canManageGuild(permissions)) {
        throwForbiddenRouteError();
      }

      return null;
    }),
  component: SettingsLayout,
});
