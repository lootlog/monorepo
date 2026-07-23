import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/guild/reservations/reservations-layout/reservations-layout";
import {
  reservationsCardsQueryOptions,
  reservationsQueryOptions,
} from "@/features/guild/reservations/reservations-api";
import { getMembersControllerGetGuildMemberReferencesQueryOptions } from "@lootlog/api-client/react-query/main/members";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void Promise.all([
        prefetchRouteQuery(
          context.queryClient,
          reservationsQueryOptions(params.guildId),
        ),
        prefetchRouteQuery(
          context.queryClient,
          reservationsCardsQueryOptions(params.guildId),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getMembersControllerGetGuildMemberReferencesQueryOptions(
            { guildId: params.guildId },
            {
              includeInactive: true,
            },
          ),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: ReservationsLayout,
});
