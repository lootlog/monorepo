import { createFileRoute } from "@tanstack/react-router";
import { EventCoordinationPage } from "@/features/guild/events/event-coordination-page";
import { EventCoordinationSkeleton } from "@/features/guild/events/event-coordination-skeleton";
import { getEventsMonitoringControllerGetCoordinationQueryOptions } from "@/lib/api/generated/main/events/events";
import {
  throwNotFoundIfResponseMatches,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/coordination",
)({
  component: EventCoordinationPage,
  pendingComponent: EventCoordinationSkeleton,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        await context.queryClient.ensureQueryData(
          getEventsMonitoringControllerGetCoordinationQueryOptions({
            guildId: params.guildId,
            eventId: params.eventId,
          }),
        );
      } catch (error) {
        throwNotFoundIfResponseMatches(error);
      }
    }),
});
