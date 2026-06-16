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

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/reservations",
)({
  loader: ({ context, params, preload }) =>
    withRouteLoaderCancellation(async () => {
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
  component: ReservationsSettings,
  pendingComponent: ReservationsSettingsSkeleton,
});
