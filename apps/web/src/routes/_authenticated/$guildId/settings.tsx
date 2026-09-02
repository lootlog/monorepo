import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@lootlog/client/main";
import { canManageGuild } from "@/lib/guild-permissions";
import {
  throwForbiddenRouteError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  prefetchRouteQuery,
} from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  loader: ({ abortController, context, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const permissionsQueryOptions =
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
        );

      if (preload) {
        void prefetchRouteQuery(context.queryClient, permissionsQueryOptions);
        return null;
      }

      const permissions = await ensureRouteQueryData(
        context.queryClient,
        permissionsQueryOptions,
      );

      if (!canManageGuild(createAccessPolicy({ capabilities: permissions }))) {
        throwForbiddenRouteError();
      }

      return null;
    }),
  component: SettingsLayout,
});
