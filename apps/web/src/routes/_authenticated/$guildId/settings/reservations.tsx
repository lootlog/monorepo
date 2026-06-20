import { createFileRoute } from "@tanstack/react-router";
import { ReservationsSettings } from "@/features/guild/settings/reservations/reservations-settings";
import { ReservationsSettingsSkeleton } from "@/features/guild/settings/reservations/reservations-skeleton";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@/lib/api/generated/main/guilds/guilds";
import { canManageGuild } from "@/lib/guild-permissions";
import {
  throwForbiddenRouteError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import {
  ensureRouteQueryData,
  prefetchRouteQuery,
} from "@/lib/router/route-prefetch";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/reservations",
)({
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

      if (!canManageGuild(permissions)) {
        throwForbiddenRouteError();
      }

      return null;
    }),
  component: ReservationsSettings,
  pendingComponent: ReservationsSettingsSkeleton,
});
