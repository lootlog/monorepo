import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/guild/reservations/reservations-layout/reservations-layout";
import {
  reservationsCardsQueryOptions,
  reservationsQueryOptions,
} from "@/features/guild/reservations/reservations-api";
import { getMembersControllerGetGuildMemberReferencesQueryOptions } from "@/lib/api/generated/main/members/members";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  loader: ({ abortController, context, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      await Promise.all([
        context.queryClient.ensureQueryData(
          reservationsQueryOptions(params.guildId),
        ),
        context.queryClient.ensureQueryData(
          reservationsCardsQueryOptions(params.guildId),
        ),
        context.queryClient.ensureQueryData(
          getMembersControllerGetGuildMemberReferencesQueryOptions(
            { guildId: params.guildId },
            {
              includeInactive: true,
            },
          ),
        ),
      ]);

      return null;
    }),
  component: ReservationsLayout,
});
