import { createFileRoute } from "@tanstack/react-router";
import { reservationSpotsQueryOptions } from "@/features/guild/reservations/reservations-api";
import { ReservationsLayout } from "@/features/guild/reservations/reservations-layout/reservations-layout";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      await prefetchRouteQuery(
        context.queryClient,
        reservationSpotsQueryOptions(params.guildId),
      ).catch(() => undefined);
      return null;
    }),
  component: ReservationsLayout,
});
